import { db } from "@/db";
import { createParaphraseTemplate } from "@/lib/templates/chat-templates";
import { summarizeCheck } from "@/lib/validators/SendMessageValidator";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";
import { ChatMistralAI } from "@langchain/mistralai";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export const POST = async (req: NextRequest) => {
	const body = await req.json();
	const { text, option, id } = summarizeCheck.parse(body);

	const llm = new ChatMistralAI({
		model: "mistral-large-latest",
		apiKey: process.env.OPENAI_API_KEY!,
		maxRetries: 2,
		temperature: 0.3,
	});

	const chain = RunnableSequence.from([
		{ text: (text: string) => text },
		createParaphraseTemplate(),
		llm,
		new StringOutputParser(),
	]);

	try {
		const content = await chain.invoke(text);

		await db.message.update({
			where: { id },
			data: { text: content },
		});

		return NextResponse.json({ content });
	} catch (error) {
		console.error("Error processing request:", error);
		return NextResponse.json(
			{ error: "Failed to process request" },
			{ status: 500 }
		);
	}
};
