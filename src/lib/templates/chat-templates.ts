import { ChatPromptTemplate } from "@langchain/core/prompts";

export const createTranslationTemplate = (language: string) =>
	ChatPromptTemplate.fromMessages([
		[
			"system",
			`You are a technical translator specialized in ${language}. 
Translate the following text to ${language}. Only respond with the translation, nothing else.

Text to translate: {input}`,
		],
		[
			"human",
			`Translate the above text to ${language}. Only provide the translation, no explanations or original text.`,
		],
	]);

export const createChatTemplate = (formattedPrevMessages: any[]) =>
	ChatPromptTemplate.fromMessages([
		[
			"system",
			`You are an AI assistant specialized in analyzing documents and providing accurate information.
        
Rules:
1. (Use the previous chat history if needed)
2. Use markdown formatting for better readability dont use code blocks
3. If context doesn't support the answer, say "I don't have enough information"
4. do not Answer any other questions that are not related to the context
5. Be concise and focused on the context

Context: {context}
Previous Chat: ${formattedPrevMessages
				.map((message) => {
					if (message.role === "user") return `User: ${message.content}\n`;
					return `Assistant: ${message.content}\n`;
				})
				.join("")}`,
		],
		["human", "{question}"],
	]);

export const createParaphraseTemplate = () =>
	ChatPromptTemplate.fromMessages([
		[
			"system",
			`You are an expert writing assistant specializing in paraphrasing text while preserving its original format.

Core Instructions:
1. Maintain all key information and technical terms
2. Use different wording without altering the structure or format
3. Keep the original tone and complexity

Input text to paraphrase: {text}`,
		],
	]);
