import { db } from "@/db";
import { supabaseClient } from "@/lib/database";
import { getUserSubscriptionPlan } from "@/lib/stripe";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { MistralAIEmbeddings } from "@langchain/mistralai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { currentUser } from "@clerk/nextjs/server";
const f = createUploadthing();

const middleware = async () => {
	const user = await currentUser();

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

		const splitter = new RecursiveCharacterTextSplitter({
			chunkSize: 4096, // Adjust this value based on your model's token limit
			chunkOverlap: 200,
			separators: ["\n\n", "\n", ". ", " ", ""],
		});

		const splitDocs = await splitter.splitDocuments(pageLevelDocs);

		const pageLevelDocsWithId = splitDocs.map((doc, index) => ({
			pageContent: doc.pageContent,
			metadata: {
				fileId: createdFile.id,
				pageNumber: index,
			},
		}));

		// vectorize and index entire document

		const embeddings = new MistralAIEmbeddings({
			apiKey: process.env.OPENAI_API_KEY!,
			model: "mistral-embed", // Default value
			onFailedAttempt: (attempt) => {
				if (attempt > 3) {
					throw new Error("Failed to get embeddings");
				}
			},
			maxRetries: 3,
		});

		await SupabaseVectorStore.fromDocuments(pageLevelDocsWithId, embeddings, {
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
