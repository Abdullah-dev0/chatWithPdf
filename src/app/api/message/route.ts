import { db } from "@/db";
import { openai } from "@/lib/openai";

import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

import { NextRequest } from "next/server";

import { createClient as Client } from "@supabase/supabase-js";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIStream, StreamingTextResponse, GoogleGenerativeAIStream } from "ai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { Content, GenerateContentRequest, GoogleGenerativeAI, TaskType } from "@google/generative-ai";
export const POST = async (req: NextRequest) => {
	// endpoint for asking a question to a pdf file

	const body = await req.json();

	const { getUser } = getKindeServerSession();
	const user = getUser();

	const { id: userId } = user;

	if (!userId) return new Response("Unauthorized", { status: 401 });

	const { fileId, message } = SendMessageValidator.parse(body);

	const file = await db.file.findFirst({
		where: {
			id: fileId,
			userId,
		},
	});

	if (!file) return new Response("Not found", { status: 404 });

	await db.message.create({
		data: {
			text: message,
			isUserMessage: true,
			userId,
			fileId,
		},
	});

	const supabaseClient = Client(process.env.SUPABASE_URL!, process.env.SUPABASE_PRIVATE_KEY!);

	// 1: vectorize message
	const embeddings = new GoogleGenerativeAIEmbeddings({
		apiKey: process.env.OPENAI_API_KEY!,
		model: "text-embedding-004", // 768 dimensions
		taskType: TaskType.RETRIEVAL_DOCUMENT,
		title: "Document title",
	});

	const vectorStore = new SupabaseVectorStore(embeddings, {
		client: supabaseClient,
		tableName: "documents",
	});

	const results = await vectorStore.similaritySearch(message, 2);

	const prevMessages = await db.message.findMany({
		where: {
			fileId,
		},
		orderBy: {
			createdAt: "asc",
		},
		take: 6,
	});

	const formattedPrevMessages = prevMessages.map((msg) => ({
		role: msg.isUserMessage ? ("user" as const) : ("model" as const),
		content: msg.text,
	}));

	const genAI = new GoogleGenerativeAI(process.env.OPENAI_API_KEY!);

	const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

	// Create an array of contents based on your existing context and conversation
	const contents: Content[] = [
		{
			role: "model",
			parts: [
				{
					text: "Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format.",
				},
			],
		},
		{
			role: "user",
			parts: [
				{
					text: `Use the following pieces of context (or previous conversation if needed) to answer the user's question in markdown format.\nIf you don't know the answer, just say that you don't know, don't try to make up an answer.

                \n----------------\n
                
                PREVIOUS CONVERSATION:
                ${formattedPrevMessages
									.map((message) => {
										return message.role === "user" ? `User: ${message.content}\n` : `Assistant: ${message.content}\n`;
									})
									.join("")}

                \n----------------\n
                
                CONTEXT:
                ${results.map((r) => r.pageContent).join("\n\n")}
                
                USER INPUT: ${message}`,
				},
			],
		},
	];

	// Construct the GenerateContentRequest
	const request: GenerateContentRequest = {
		contents: contents,
	};

	const response = await model.generateContentStream(request);

	return new StreamingTextResponse(GoogleGenerativeAIStream({ stream: response.stream }));
};
