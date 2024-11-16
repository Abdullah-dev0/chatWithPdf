import { cn } from "@/lib/utils";
import { ExtendedMessage, MessageLoadingStates, MessageUpdate } from "@/types/message";
import { format } from "date-fns";
import { forwardRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Icons } from "../Icons";
import TextOptions from "./TextOptions";
import { Loader2 } from "lucide-react";

interface MessageProps {
	message: ExtendedMessage;
	isNextMessageSamePerson: boolean;
}

const Message = forwardRef<HTMLDivElement, MessageProps>(({ message, isNextMessageSamePerson }, ref) => {
	const [messageStates, setMessageStates] = useState<MessageLoadingStates>({});
	const [updates, setUpdates] = useState<MessageUpdate | null>(null);

	const handleUpdateMessage = (update: MessageUpdate) => {
		setUpdates(update);
	};

	const handleLoadingStateChange = (state: MessageLoadingStates) => {
		setMessageStates((prev) => ({ ...prev, ...state }));
	};

	const renderMessageContent = () => {
		// Show loading state for specific operations
		if (messageStates.summarize || messageStates.paraphrase) {
			return (
				<span className="flex h-full items-center justify-center">
					<Loader2 className="h-4 w-4 animate-spin" />
					<span className="ml-2 text-sm text-gray-500">
						{messageStates.summarize ? "Summarizing..." : "Paraphrasing..."}
					</span>
				</span>
			);
		}

		// Show updated content if available
		if (updates?.content) {
			return (
				<ReactMarkdown
					className={cn("prose dark:prose-invert max-w-none", {
						"text-zinc-50": message.isUserMessage,
					})}>
					{updates.content}
				</ReactMarkdown>
			);
		}

		// Show original message
		return typeof message.text === "string" ? (
			<ReactMarkdown
				className={cn("prose dark:prose-invert max-w-none", {
					"text-zinc-50": message.isUserMessage,
				})}>
				{message.text}
			</ReactMarkdown>
		) : (
			message.text
		);
	};

	return (
		<div
			ref={ref}
			className={cn("flex items-end", {
				"justify-end": message.isUserMessage,
			})}>
			<div
				className={cn("relative flex h-6 w-6 aspect-square items-center justify-center", {
					"order-2 bg-blue-600 rounded-sm": message.isUserMessage,
					"order-1 bg-zinc-800 rounded-sm": !message.isUserMessage,
					invisible: isNextMessageSamePerson,
				})}>
				{message.isUserMessage ? (
					<Icons.user className="fill-zinc-200 text-zinc-200 h-3/4 w-3/4" />
				) : (
					<Icons.logo className="fill-zinc-300 h-3/4 w-3/4" />
				)}
			</div>

			<div
				className={cn("flex flex-col space-y-2 text-base max-w-md mx-2", {
					"order-1 items-end": message.isUserMessage,
					"order-2 items-start": !message.isUserMessage,
				})}>
				<div
					className={cn("px-4 py-2 rounded-lg inline-block", {
						"bg-blue-600 text-white": message.isUserMessage,
						"bg-gray-200 text-gray-900": !message.isUserMessage,
						"rounded-br-none": !isNextMessageSamePerson && message.isUserMessage,
						"rounded-bl-none": !isNextMessageSamePerson && !message.isUserMessage,
					})}>
					{!message.isUserMessage && typeof message.text === "string" && (
						<TextOptions
							text={message.text}
							id={message.id}
							onUpdateMessage={handleUpdateMessage}
							onLoadingStateChange={handleLoadingStateChange}
						/>
					)}

					{renderMessageContent()}

					{message.id !== "loading-message" && (
						<div
							className={cn("text-xs select-none mt-2 w-full text-right", {
								"text-zinc-500": !message.isUserMessage,
								"text-blue-300": message.isUserMessage,
							})}>
							{format(new Date(message.createdAt), "HH:mm")}
						</div>
					)}
				</div>
			</div>
		</div>
	);
});

Message.displayName = "Message";

export default Message;
