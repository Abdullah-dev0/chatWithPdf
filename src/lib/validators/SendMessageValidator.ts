import { z } from "zod";

export const SendMessageValidator = z.object({
	fileId: z.string(),
	message: z.string().min(1, "Message is required"),
	language: z.string().toLowerCase(),
});

export const summarizeCheck = z.object({
	text: z.string(),
	option: z.enum(["Summarize", "Paraphrase"]),
	language: z.string().default("english"),
	id: z.string(),
});
