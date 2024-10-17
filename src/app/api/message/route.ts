import { db } from "@/db";
import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableLike, RunnableSequence } from "@langchain/core/runnables";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { MistralAIEmbeddings } from "@langchain/mistralai";
import { createClient as Client } from "@supabase/supabase-js";
import { StreamingTextResponse } from "ai";
import { NextRequest } from "next/server";
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

	const supabaseClient = Client(process.env.SUPABASE_URL!, process.env.SUPABASE_PRIVATE_KEY!);

	// 1: vectorize message
	const embeddings = new MistralAIEmbeddings({
		apiKey: process.env.OPENAI_API_KEY!,
		model: "mistral-embed", // Default value
	});

	const vectorStore = new SupabaseVectorStore(embeddings, {
		client: supabaseClient,
		tableName: "documents",
		queryName: "match_documents",
	});

	const retriever = vectorStore.asRetriever();

	const retrievedDocs = await retriever.invoke(message);

	const SYSTEM_TEMPLATE = `
	You are a knowledgeable AI assistant. Use the provided context to answer the user's question in a medium concise markdown format. If the context is irrelevant or insufficient or you dont know, respond simply with "I don't have knowledge about that." 
	
	Context: {context}
	
	User Question: {question}
	
	Your Answer :
	`;
	const language: string = "English";

	const translationTemplate = `Given a sentence, translate that sentence into ${language}
	sentence: {translated_Text}
	translated sentence:
	`;

	const systemPrompt = PromptTemplate.fromTemplate(SYSTEM_TEMPLATE);

	const llm = new ChatGoogleGenerativeAI({
		model: "gemini-pro",
		temperature: 1,
		maxRetries: 2,
		apiKey: process.env.GOOGLE_API_KEY!,
	});

	const translationPrompt = PromptTemplate.fromTemplate(translationTemplate);
	// const systemChain = RunnableSequence.from([systemPrompt, llm, new StringOutputParser()]);
	// const translationChain = RunnableSequence.from([translationPrompt, llm, new StringOutputParser()]);

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
		context: retrievedDocs.map((doc) => doc.pageContent).join("\n"),
		question: message,
	});

	const readableStream = new ReadableStream({
		async start(controller) {
			let response = "";

			for await (const chunk of stream) {
				// Encode and send each chunk to the client
				controller.enqueue(chunk);
				console.log(chunk);
				// Add chunk to the response string (but don't save to DB yet)
				response += chunk;
			}

			// Close the stream after all chunks are sent
			controller.close();

			// Once the entire response is completed, save to the database
			await db.message.create({
				data: {
					text: response, // Save the entire response when streaming completes
					isUserMessage: false,
					fileId,
					userId,
				},
			});
		},
	});

	// Return the readable stream as the response to the client
	return new StreamingTextResponse(readableStream);
};
