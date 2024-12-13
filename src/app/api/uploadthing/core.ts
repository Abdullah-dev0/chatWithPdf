import { db } from "@/db";
import { embeddings } from "@/lib/embeddings";
import index from "@/lib/pinecone";
import { currentUser } from "@clerk/nextjs/server";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { PineconeStore } from "@langchain/pinecone";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

const f = createUploadthing();

export const ourFileRouter: FileRouter = {
	FileUploader: f({ pdf: { maxFileSize: "8MB" } })
		.middleware(async () => {
			const user = await currentUser();

			if (!user || !user.id) throw new UploadThingError("No user ID");

			return { userId: user.id };
		})
		.onUploadComplete(async ({ metadata, file }) => {
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
					chunkSize: 2000,
					chunkOverlap: 100,
					separators: ["\n\n", "\n", ". ", " ", ""],
				});

				const splitDocs = await splitter.splitDocuments(pageLevelDocs);

				const pageLevelDocsWithId = splitDocs.map((doc) => ({
					pageContent: doc.pageContent,
					metadata: {
						fileId: createdFile.id,
						pageNumber: doc.metadata.loc?.pageNumber,
					},
				}));

				await PineconeStore.fromDocuments(pageLevelDocsWithId, embeddings, {
					pineconeIndex: index,
					namespace: createdFile.id,
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
		}),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
