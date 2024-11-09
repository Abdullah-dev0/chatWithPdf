export const maxDuration = 60;
import { db } from "@/db";
import { supabaseClient } from "@/lib/database";
import { embeddings } from "@/lib/embeddings";
import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { currentUser } from "@clerk/nextjs/server";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI } from "@langchain/mistralai";
import { StreamingTextResponse } from "ai";

import { NextRequest } from "next/server";
const language: string = "English"; // Change this to the language you want to translate to

const llm = new ChatMistralAI({
	model: "mistral-large-latest",
	apiKey: process.env.OPENAI_API_KEY!,
	maxRetries: 2,
	topP: 1,
	temperature: 0,
});

// Improved system prompt for better context utilization
const SYSTEM_TEMPLATE = `
Use the following pieces of context (or previous conversaton if needed) to answer the users question in markdown format Do not wrap your response in markdown code blocks or fence blocks (\`\`\`). Just write the markdown content directly. \n If you don't know the answer or there is no enough context , just say that you don't know, don't try to make up an answer

*IMPORTANT* : Do not Answer any other questions other than the context provided.

Previous Conversation:{conversation_history}

Context:{context}


User Question: {question}


Answer:
 
`;

const translationTemplate = `
Translate the following content to ${language}, following these rules:
1. Preserve all technical terms, code snippets, and variables in their original form
3. Provide technical term explanations in ${language} where necessary
4. Keep URLs unchanged but add transliterated context

Original: {translated_Text}

Translated content:`;

const systemPrompt = PromptTemplate.fromTemplate(SYSTEM_TEMPLATE);

const translationPrompt = PromptTemplate.fromTemplate(translationTemplate);

export const POST = async (req: NextRequest) => {
	const body = await req.json();

	const user = await currentUser();

	if (!user) return new Response("Unauthorized", { status: 401 });

	const { fileId, message } = SendMessageValidator.parse(body);

	const file = await db.file.findFirst({
		where: {
			id: fileId,
			// user.id,
		},
	});

	if (!file) return new Response("Not found", { status: 404 });

	await db.message.create({
		data: {
			text: message,
			isUserMessage: true,
			// userId,
			fileId,
		},
	});

	const vectorStore = new SupabaseVectorStore(embeddings, {
		client: supabaseClient,
		tableName: "documents",
		filter: { fileId },
		queryName: "match_documents",
	});

	const retriever = vectorStore.asRetriever({
		searchType: "similarity",
		k: 5,
	});

	const retrievedDocs = await retriever.invoke(message);

	const prevMessages = await db.message.findMany({
		where: { fileId },
		orderBy: { createdAt: "asc" },
		take: 6,
	});

	const formattedPrevMessages = prevMessages.map((msg) => ({
		role: msg.isUserMessage ? "user" : "assistant",
		content: msg.text,
	}));

	const conversationHistory = formattedPrevMessages
		.map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
		.join("\n");

	const chainArray: any = [
		{
			context: async () => retrievedDocs.map((doc) => doc.pageContent).join("\n"),
			question: new RunnablePassthrough(),
			conversation_history: async () => conversationHistory,
		},
		systemPrompt,
		llm,
		new StringOutputParser(),
	];

	if (language !== "English") {
		chainArray.push(
			{ translated_Text: (preresult: string) => preresult },
			translationPrompt,
			llm,
			new StringOutputParser(),
		);
	}

	const chain = RunnableSequence.from(chainArray);

	const stream = await chain.stream({
		question: message,
	});

	const readableStream = new ReadableStream({
		async start(controller) {
			const chunks: string[] = [];

			try {
				for await (const chunk of stream) {
					controller.enqueue(chunk);
					chunks.push(chunk);
				}

				// Save the complete message after receiving all chunks
				await db.message.create({
					data: {
						text: chunks.join(""),
						isUserMessage: false,
						fileId,
						// userId,
					},
				});

				controller.close();
			} catch (error) {
				console.error("Error saving message", error);
				controller.error(error);
			}
		},
	});

	// Return the readable stream as the response to the client
	return new StreamingTextResponse(readableStream);
};
