import { db } from "@/db";
import { UserJSON, WebhookEvent } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { Webhook } from "svix";

export async function POST(req: Request) {
	// You can find this in the Clerk Dashboard -> Webhooks -> choose the endpoint
	const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

	if (!WEBHOOK_SECRET) {
		throw new Error("Please add WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local");
	}

	// Get the headers
	const headerPayload = headers();
	const svix_id = headerPayload.get("svix-id");
	const svix_timestamp = headerPayload.get("svix-timestamp");
	const svix_signature = headerPayload.get("svix-signature");

	// If there are no headers, error out
	if (!svix_id || !svix_timestamp || !svix_signature) {
		return new Response("Error occured -- no svix headers", {
			status: 400,
		});
	}

	// Get the body
	const payload = await req.json();
	const body = JSON.stringify(payload);

	// Create a new Svix instance with your secret.
	const wh = new Webhook(WEBHOOK_SECRET);

	let evt: WebhookEvent;

	// Verify the payload with the headers
	try {
		evt = wh.verify(body, {
			"svix-id": svix_id,
			"svix-timestamp": svix_timestamp,
			"svix-signature": svix_signature,
		}) as WebhookEvent;
	} catch (err) {
		console.error("Error verifying webhook:", err);
		return new Response("Error occured", {
			status: 400,
		});
	}

	// Do something with the payload
	// For this guide, you simply log the payload to the console

	const eventType = evt.type;

	const { id, email_addresses: emailAddresses, image_url: image } = evt.data as UserJSON;

	if (eventType === "user.created") {
		try {
			const user = await db.user.create({
				data: {
					userId: id!,
					email: emailAddresses[0].email_address,
					image: image ?? "",
				},
			});

			if (!user) {
				throw new Error("User not created");
			}
		} catch (error) {
			throw new Error("Error creating user");
		}
	}

	if (eventType === "user.updated") {
		try {
			const user = await db.user.update({
				where: { userId: id! },
				data: {
					image: image,
					email: emailAddresses[0].email_address,
				},
			});

			if (!user) {
				throw new Error("User not updated");
			}
		} catch (error) {
			throw new Error("Error updating user");
		}
	}

	if (eventType === "user.deleted") {
		try {
			await db.user.delete({ where: { userId: id! } });
		} catch (error) {
			throw new Error("Error deleting user");
		}
	}

	return new Response("Webhook received", { status: 200 });
}
