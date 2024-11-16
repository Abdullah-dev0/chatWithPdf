import { MistralAIEmbeddings } from "@langchain/mistralai";

// 1: vectorize message with optimized settings
export const embeddings = new MistralAIEmbeddings({
	apiKey: process.env.OPENAI_API_KEY!,
	model: "mistral-embed",
	maxRetries: 2,
	onFailedAttempt: (err) => {
		if (err.response?.status === 429) {
			throw new Error("Rate limit exceeded");
		}
	},
});
