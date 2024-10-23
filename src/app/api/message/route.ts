import { db } from "@/db";
import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableLike, RunnableSequence } from "@langchain/core/runnables";
// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatMistralAI, MistralAIEmbeddings } from "@langchain/mistralai";
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
	const language: string = "English";

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
		filter: { fileId },
		queryName: "match_documents",
	});

	const retriever = vectorStore.asRetriever();

	const retrievedDocs = await retriever.invoke(message);

	const SYSTEM_TEMPLATE = `
	You are a highly advanced AI assistant trained to provide accurate and informative responses. Utilize the provided context to address the user's inquiry in a concise and markdown format. If the context is inadequate or unrelated don't add anything yourself just, respond succinctly with "Insufficient knowledge to provide an accurate answer."
  Context: {context}
  User Inquiry: {question}
  Response:
	`;


	const translationTemplate = `Given a sentence, translate that sentence into ${language} , dont add anything else to the sentence.
	sentence: {translated_Text}
	translated sentence:
	`;

	const systemPrompt = PromptTemplate.fromTemplate(SYSTEM_TEMPLATE);

	const llm = new ChatMistralAI({
		model: "mistral-large-latest",
		apiKey: process.env.OPENAI_API_KEY!,
		maxRetries: 2,
	});

	const translationPrompt = PromptTemplate.fromTemplate(translationTemplate);

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
