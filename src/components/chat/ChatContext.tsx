import { trpc } from "@/app/_trpc/client";
import { INFINITE_QUERY_LIMIT } from "@/constant/infinite-query";
import { useMutation } from "@tanstack/react-query";
import { ReactNode, createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type StreamResponse = {
	addMessage: () => void;
	message: string;
	language: string;
	setMessage: (message: string) => void;
	setLanguage: (language: string) => void;
	handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
	isLoading: boolean;
};

export const ChatContext = createContext<StreamResponse>({
	addMessage: () => {},
	message: "",
	language: "",
	setMessage: () => {},
	setLanguage: () => {},
	handleInputChange: () => {},
	isLoading: false,
});

interface Props {
	fileId: string;
	children: ReactNode;
}

export const ChatContextProvider = ({ fileId, children }: Props) => {
	const [message, setMessage] = useState<string>("");
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [language, setLanguage] = useState<string>("english");

	const utils = trpc.useUtils();

	const backupMessage = useRef("");
	const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

	useEffect(() => {
		return () => {
			// Cleanup stream reader on unmount
			if (readerRef.current) {
				readerRef.current.cancel();
			}
		};
	}, []);

	const { mutate: sendMessage } = useMutation({
		mutationFn: async ({ message }: { message: string }) => {
			const response = await fetch("/api/message", {
				method: "POST",
				body: JSON.stringify({
					fileId,
					message,
					language,
				}),
			});

			return response.body;
		},
		onMutate: async ({ message }) => {
			backupMessage.current = message;
			setMessage("");

			// step 1
			await utils.getFileMessages.cancel();

			// step 2
			const previousMessages = utils.getFileMessages.getInfiniteData();

			// step 3
			utils.getFileMessages.setInfiniteData({ fileId, limit: INFINITE_QUERY_LIMIT }, (old) => {
				if (!old) {
					return {
						pages: [],
						pageParams: [],
					};
				}

				let newPages = [...old.pages];

				let latestPage = newPages[0]!;

				latestPage.messages = [
					{
						createdAt: new Date().toISOString(),
						id: crypto.randomUUID(),
						text: message,
						isUserMessage: true,
					},
					...latestPage.messages,
				];

				newPages[0] = latestPage;

				return {
					...old,
					pages: newPages,
				};
			});

			setIsLoading(true);

			return {
				previousMessages: previousMessages?.pages.flatMap((page) => page.messages) ?? [],
			};
		},
		// @ts-ignore
		onSuccess: async (stream) => {
			setIsLoading(false);

			if (!stream) {
				toast.error("Failed to send message", {
					description: "There was an error sending the message",
				});
				return;
			}

			const reader = stream.getReader();
			readerRef.current = reader;

			const decoder = new TextDecoder();
			let done = false;

			// accumulated response
			let accResponse = "";

			while (!done) {
				const { value, done: doneReading } = await reader.read();
				done = doneReading;
				const chunkValue = decoder.decode(value);

				accResponse += chunkValue;

				// append chunk to the actual message
				utils.getFileMessages.setInfiniteData({ fileId, limit: INFINITE_QUERY_LIMIT }, (old) => {
					if (!old) return { pages: [], pageParams: [] };

					let isAiResponseCreated = old.pages.some((page) =>
						page.messages.some((message) => message.id === "ai-response"),
					);

					let updatedPages = old.pages.map((page) => {
						if (page === old.pages[0]) {
							let updatedMessages;
							if (!isAiResponseCreated) {
								updatedMessages = [
									{
										createdAt: new Date().toISOString(),
										id: "ai-response",
										text: accResponse,
										isUserMessage: false,
									},
									...page.messages,
								];
							} else {
								updatedMessages = page.messages.map((message) => {
									if (message.id === "ai-response") {
										return {
											...message,
											text: accResponse,
										};
									}
									return message;
								});
							}

							return {
								...page,
								messages: updatedMessages,
							};
						}

						return page;
					});

					return { ...old, pages: updatedPages };
				});
			}
		},

		onError: (error: any, __, context) => {
			console.log(error);
			toast.error(error.message, {
				description: "There was an error sending the message",
			});
			setMessage(backupMessage.current);
			utils.getFileMessages.setData({ fileId }, { messages: context?.previousMessages ?? [] });
		},
		onSettled: async () => {
			setIsLoading(false);

			await utils.getFileMessages.invalidate({ fileId });
		},
	});

	const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setMessage(e.target.value);
	}, []);

	const addMessage = () => sendMessage({ message });

	const contextValue = useMemo(
		() => ({
			addMessage,
			message,
			setMessage,
			language,
			setLanguage,
			handleInputChange,
			isLoading,
		}),
		[message, language, isLoading, handleInputChange],
	);

	return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
};
