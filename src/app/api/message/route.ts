import { db } from "@/db";
import { SendMessageValidator } from "@/lib/validators/SendMessageValidator";
import { TaskType } from "@google/generative-ai";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { SupabaseHybridSearch } from "@langchain/community/retrievers/supabase";
import { HumanMessage } from "@langchain/core/messages";
import { ChatMistralAI } from "@langchain/mistralai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { createClient as Client } from "@supabase/supabase-js";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { NextRequest } from "next/server";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
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
		apiKey: process.env.GOOGLE_API_KEY!,
		model: "text-embedding-004", // 768 dimensions
		taskType: TaskType.RETRIEVAL_DOCUMENT,
		title: "Document title",
	});

	const vectorStore = new SupabaseVectorStore(embeddings, {
		client: supabaseClient,
		tableName: "documents",
		queryName: "match_documents",
	});

	const retriever = vectorStore.asRetriever();

	const retrievedDocs = await retriever.invoke(message);

	console.log(retrievedDocs);

	const SYSTEM_TEMPLATE = `Answer the user's questions based on the below context in markdown. 
              If the context doesn't contain any relevant information to the question, don't make something up and just say "I don't have knowledge about that.":
              <context>
{context}
</context>
`;

	const llm = new ChatMistralAI({
		model: "mistral-large-latest",
		temperature: 0,
		maxRetries: 2,
		apiKey: process.env.OPENAI_API_KEY!,
	});

	const questionAnsweringPrompt = ChatPromptTemplate.fromMessages([
		["system", SYSTEM_TEMPLATE],
		new MessagesPlaceholder("messages"),
	]);

	const documentChain = await createStuffDocumentsChain({
		llm,
		prompt: questionAnsweringPrompt,
	});

	const res = await documentChain.invoke({
		messages: [new HumanMessage(message)],
		context: retrievedDocs,
	});

	console.log(res, "this is the response");

	await db.message.create({
		data: {
			text: res,
			isUserMessage: false,
			userId,
			fileId,
		},
	});

	return new Response(res);
};
