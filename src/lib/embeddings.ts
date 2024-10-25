import { MistralAIEmbeddings } from "@langchain/mistralai";

// 1: vectorize message with optimized settings
export const embeddings = new MistralAIEmbeddings({
	apiKey: process.env.OPENAI_API_KEY!,
	model: "mistral-embed",
	batchSize: 8, // Optimize embedding batch size
	stripNewLines: true, // Clean text for better embeddings
});
