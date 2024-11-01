import { db } from "@/db";
import { supabaseClient } from "@/lib/database";
import { embeddings } from "@/lib/embeddings";
import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableLike, RunnableSequence } from "@langchain/core/runnables";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
// import { ChatMistralAI } from "@langchain/mistralai";
import { StreamingTextResponse } from "ai";
import { NextRequest } from "next/server";
const language: string = "English"; // Change this to the language you want to translate to

const llm = new ChatGoogleGenerativeAI({
	model: "gemini-1.5-pro",
	apiKey: process.env.GOOGLE_API_KEY!,
	maxRetries: 2,
	topP: 0.8,
	temperature: 0.3,
});

// Improved system prompt for better context utilization
const SYSTEM_TEMPLATE = `
Use the following pieces of context to answer the user's question in markdown format.
Important Instructions:
1. Only use information from the provided context to answer.
2. If uncertain or if context doesn't contain the answer or you dont know the answer don't try to make anyting just , say "I don't have enough information to answer that accurately"
3. Keep responses focused and relevant also make sure to answer the question directly and concisely.
4. Use bullet points or numbered lists when appropriate for clarity

Context: {context}
User Question: {question}

Answer:`;

// Enhanced translation template with technical preservation
const translationTemplate = `
Translate the following content to ${language}, following these rules:
1. Preserve all technical terms, code snippets, and variables in their original form
2. Maintain markdown formatting
3. Provide technical term explanations in ${language} where necessary
4. Keep URLs unchanged but add transliterated context

Original: {translated_Text}

Translated content:`;

const systemPrompt = PromptTemplate.fromTemplate(SYSTEM_TEMPLATE);

const translationPrompt = PromptTemplate.fromTemplate(translationTemplate);

export const POST = async (req: NextRequest) => {
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

	const chainArray: [RunnableLike<any>, RunnableLike<any>, RunnableLike<any>] = [
		systemPrompt,
		llm,
		new StringOutputParser(),
	];

	if (language !== "English") {
		chainArray.push({ translated_Text: (preresult) => preresult }, translationPrompt, llm, new StringOutputParser());
	}

	const chain = RunnableSequence.from(chainArray);

	const stream = await chain.stream({
		context: retrievedDocs.map((doc) => doc.pageContent).join("\n\n"),
		question: message,
	});

	const readableStream = new ReadableStream({
		async start(controller) {
			let response = "";
			let chunkCount = 0;

			try {
				for await (const chunk of stream) {
					// Add rate limiting for very long streams
					if (chunkCount++ % 50 === 0) {
						await new Promise((resolve) => setTimeout(resolve, 1)); // Micro-delay every 50 chunks
					}

					// Encode and send each chunk to the client
					controller.enqueue(chunk);
					console.log(chunk);
					response += chunk;
				}

				// Close the stream after all chunks are sent
				controller.close();

				// Save to database with error handling
				await db.message
					.create({
						data: {
							text: response,
							isUserMessage: false,
							fileId,
							userId,
						},
					})
					.catch((error) => {
						console.error("Failed to save to database:", error);
					});
			} catch (error) {
				console.error("Stream processing error:", error);
				controller.error(error);
			}
		},
	});

	// Return the readable stream as the response to the client
	return new StreamingTextResponse(readableStream);
};
