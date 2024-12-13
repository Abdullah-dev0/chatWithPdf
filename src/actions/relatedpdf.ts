"use server";

import { db } from "@/db";
import { getRelatedWords } from "@/lib/templates/chat-templates";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatMistralAI } from "@langchain/mistralai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { File } from "@prisma/client";

type ErrorResponse = {
	success: false;
	error: string;
	step?: string;
};

type SuccessResponse = {
	success: true;
	message: string;
	data: any;
};

export const relatedPdf = async (file: File): Promise<ErrorResponse | SuccessResponse> => {
	try {
		// Fetch PDF
		const response = await fetch(file.url);
		if (!response.ok) {
			throw new Error(`Failed to fetch PDF: ${response.statusText}`);
		}

		// Load PDF
		const blob = await response.blob();
		const loader = new PDFLoader(blob);
		let pageLevelDocs;
		try {
			pageLevelDocs = await loader.load();
		} catch (error) {
			return {
				success: false,
				error: "Failed to load PDF",
				step: "PDF Loading",
			};
		}

		// Split text
		const splitter = new RecursiveCharacterTextSplitter({
			chunkSize: 2000,
			chunkOverlap: 100,
			separators: ["\n\n", "\n", ". ", " ", ""],
		});

		let splitDocs;
		try {
			splitDocs = await splitter.splitDocuments(pageLevelDocs);
		} catch (error) {
			return {
				success: false,
				error: "Failed to split document",
				step: "Text Splitting",
			};
		}

		const textChunks = splitDocs.map((doc) => doc.pageContent);

		// Initialize LLM
		if (!process.env.OPENAI_API_KEY) {
			return {
				success: false,
				error: "Missing OpenAI API key",
				step: "LLM Initialization",
			};
		}

		const llm = new ChatMistralAI({
			model: "mistral-large-latest",
			apiKey: process.env.OPENAI_API_KEY,
			maxRetries: 2,
			temperature: 0.3,
		});

		// Get related words
		let res;
		try {
			const chain = RunnableSequence.from([getRelatedWords, llm, new StringOutputParser()]);
			res = await chain.invoke({
				context: textChunks,
			});
		} catch (error) {
			return {
				success: false,
				error: "Failed to generate related words",
				step: "LLM Processing",
			};
		}

		// Google Search
		const API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
		const CX = process.env.GOOGLE_SEARCH_CX;

		if (!API_KEY || !CX) {
			return {
				success: false,
				error: "Missing Google Search credentials",
				step: "Search Configuration",
			};
		}

		const query = res;

		const searchResponse = await fetch(
			`https://www.googleapis.com/customsearch/v1?q=${query}%20filetype:pdf&key=${API_KEY}&cx=${CX}&num=4`,
		);
		const data = await searchResponse.json();

		const textdata = data.items.map((item: any) => item);

		const markdownLinks = textdata
			.map((url: any) => {
				return `- [📄 ${url.title + 1}](${url.link})`;
			})
			.join("\n");

		const saveMessage = await db.message.create({
			data: {
				text: markdownLinks,
				isUserMessage: false,
				fileId: file.id,
				userId: file.userId,
			},
		});

		return {
			success: true,
			message: "Related PDF data",
			data: saveMessage,
		};
	} catch (error: any) {
		return {
			success: false,
			error: error.message,
		};
	}
};
