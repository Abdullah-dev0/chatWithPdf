import { INFINITE_QUERY_LIMIT } from "@/constant/infinite-query";
import { PLANS } from "@/constant/stripe";
import { db } from "@/db";
import { getUserSubscriptionPlan, stripe } from "@/lib/stripe";
import { absoluteUrl } from "@/lib/utils";
import { auth } from "@clerk/nextjs/server";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { privateProcedure, publicProcedure, router } from "./trpc";
import index from "@/lib/pinecone";

export const appRouter = router({
	authCallback: publicProcedure.query(async () => {
		const user = await auth();

		if (!user || !user.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

		return { success: true };
	}),

	getUserFiles: privateProcedure.query(async ({ ctx }) => {
		const { userId } = ctx;

		return await db.file.findMany({
			where: {
				userId,
			},
		});
	}),

	createStripeSession: privateProcedure.mutation(async ({ ctx }) => {
		const { userId } = ctx;

		const billingUrl = absoluteUrl("/dashboard/billing");

		if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });

		const dbUser = await db.user.findFirst({
			where: {
				id: userId,
			},
		});

		if (!dbUser) throw new TRPCError({ code: "UNAUTHORIZED" });

		const subscriptionPlan = await getUserSubscriptionPlan();

		if (subscriptionPlan.isSubscribed && dbUser.stripeCustomerId) {
			const stripeSession = await stripe.billingPortal.sessions.create({
				customer: dbUser.stripeCustomerId,
				return_url: billingUrl,
			});

			return { url: stripeSession.url };
		}

		const stripeSession = await stripe.checkout.sessions.create({
			success_url: billingUrl,
			cancel_url: billingUrl,
			payment_method_types: ["card", "paypal"],
			mode: "subscription",
			billing_address_collection: "auto",
			line_items: [
				{
					price: PLANS.find((plan) => plan.name === "Pro")?.price.priceIds.test,
					quantity: 1,
				},
			],
			metadata: {
				userId: userId,
			},
		});

		return { url: stripeSession.url };
	}),

	getFileMessages: privateProcedure
		.input(
			z.object({
				limit: z.number().min(1).max(100).nullish(),
				cursor: z.string().nullish(),
				fileId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { userId } = ctx;
			const { fileId, cursor } = input;
			const limit = input.limit ?? INFINITE_QUERY_LIMIT;

			const file = await db.file.findFirst({
				where: {
					id: fileId,
					userId,
				},
			});

			if (!file) throw new TRPCError({ code: "NOT_FOUND" });

			const messages = await db.message.findMany({
				take: limit + 1,
				where: {
					fileId,
				},
				orderBy: {
					createdAt: "desc",
				},
				cursor: cursor ? { id: cursor } : undefined,
				select: {
					id: true,
					isUserMessage: true,
					createdAt: true,
					text: true,
				},
			});

			let nextCursor: typeof cursor | undefined = undefined;
			if (messages.length > limit) {
				const nextItem = messages.pop();
				nextCursor = nextItem?.id;
			}

			return {
				messages,
				nextCursor,
			};
		}),

	getFileUploadStatus: privateProcedure.input(z.object({ fileId: z.string() })).query(async ({ input, ctx }) => {
		const file = await db.file.findFirst({
			where: {
				id: input.fileId,
				userId: ctx.userId,
			},
		});

		if (!file) return { status: "PENDING" as const };

		return { status: file.uploadStatus };
	}),

	getFile: privateProcedure.input(z.object({ key: z.string() })).mutation(async ({ ctx, input }) => {
		const { userId } = ctx;

		const file = await db.file.findFirst({
			where: {
				key: input.key,
				userId,
			},
		});

		if (!file) throw new TRPCError({ code: "NOT_FOUND" });

		return file;
	}),

	deleteFile: privateProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
		const { userId } = ctx;

		const file = await db.file.findFirst({
			where: {
				id: input.id,
				userId,
			},
		});

		if (!file) throw new TRPCError({ code: "NOT_FOUND" });

		const deleteFileFromDb = async (id: string) => {
			return db.file.delete({
				where: {
					id,
				},
			});
		};

		const deleteFileFromIndex = async (id: string) => {
			return index.namespace(id).deleteAll();
		};

		try {
			await Promise.all([
				deleteFileFromDb(input.id),
				deleteFileFromIndex(input.id),
			]);
		} catch (error) {
			throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete file" });
		}
	}),
});

export type AppRouter = typeof appRouter;
