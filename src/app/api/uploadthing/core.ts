import { db } from "@/db";
import { getUserSubscriptionPlan } from "@/lib/stripe";
import { TaskType } from "@google/generative-ai";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { createClient as Client } from "@supabase/supabase-js";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";

const f = createUploadthing();

const middleware = async () => {
	const { getUser } = getKindeServerSession();
	const user = getUser();

	if (!user || !user.id) throw new Error("Unauthorized");

	const subscriptionPlan = await getUserSubscriptionPlan();

	return { subscriptionPlan, userId: user.id };
};

const onUploadComplete = async ({
	metadata,
	file,
}: {
	metadata: Awaited<ReturnType<typeof middleware>>;
	file: {
		key: string;
		name: string;
		url: string;
	};
}) => {
	const isFileExist = await db.file.findFirst({
		where: {
			key: file.key,
		},
	});

	if (isFileExist) return;

	const createdFile = await db.file.create({
		data: {
			key: file.key,
			name: file.name,
			userId: metadata.userId,
			url: file.url,
			uploadStatus: "PROCESSING",
		},
	});

	try {
		const response = await fetch(file.url);

		const blob = await response.blob();

		const loader = new PDFLoader(blob);

		const pageLevelDocs = await loader.load();

		const textSplitter = new RecursiveCharacterTextSplitter({
			chunkSize: 1000,
			chunkOverlap: 200,
		});

		const splits = await textSplitter.splitDocuments(pageLevelDocs);

		console.log(splits, "these are splits");

		// const { subscriptionPlan } = metadata;
		// const { isSubscribed } = subscriptionPlan;

		// const isProExceeded = pagesAmt > PLANS.find((plan) => plan.name === "Pro")!.pagesPerPdf;
		// const isFreeExceeded = pagesAmt > PLANS.find((plan) => plan.name === "Free")!.pagesPerPdf;

		// if ((isSubscribed && isProExceeded) || (!isSubscribed && isFreeExceeded)) {
		// 	await db.file.update({
		// 		data: {
		// 			uploadStatus: "FAILED",
		// 		},
		// 		where: {
		// 			id: createdFile.id,
		// 		},
		// 	});
		// }

		// vectorize and index entire document

		const supabaseClient = Client(process.env.SUPABASE_URL!, process.env.SUPABASE_PRIVATE_KEY!);

		const embeddings = new GoogleGenerativeAIEmbeddings({
			apiKey: process.env.OPENAI_API_KEY!,
			model: "text-embedding-004", // 768 dimensions
			taskType: TaskType.RETRIEVAL_DOCUMENT,
			title: "Document title",
		});

		const vectorStore = await SupabaseVectorStore.fromDocuments(splits, embeddings, {
			client: supabaseClient,
			tableName: "documents",
		});

		await db.file.update({
			data: {
				uploadStatus: "SUCCESS",
			},
			where: {
				id: createdFile.id,
			},
		});
	} catch (err) {
		await db.file.update({
			data: {
				uploadStatus: "FAILED",
			},
			where: {
				id: createdFile.id,
			},
		});
		console.log(err);
	}
};

export const ourFileRouter = {
	freePlanUploader: f({ pdf: { maxFileSize: "4MB" } })
		.middleware(middleware)
		.onUploadComplete(onUploadComplete),
	proPlanUploader: f({ pdf: { maxFileSize: "16MB" } })
		.middleware(middleware)
		.onUploadComplete(onUploadComplete),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
function createClient(SUPABASE_URL: string | undefined, SUPABASE_PRIVATE_KEY: string | undefined) {
	throw new Error("Function not implemented.");
}
