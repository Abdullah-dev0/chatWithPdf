import { Send } from "lucide-react";
import { useContext, useRef } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { ChatContext } from "./ChatContext";
import SelectLanguage from "./SelectLanguage";
import { toast } from "sonner";

interface ChatInputProps {
	isDisabled?: boolean;
}

const ChatInput = ({ isDisabled }: ChatInputProps) => {
	const { addMessage, handleInputChange, isLoading, message } = useContext(ChatContext);
	console.log("ChatInput component rendered");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	return (
		<div className="absolute bottom-0 left-0 w-full">
			<div className="flex flex-row  items-center px-2 md:px-4 md:last:mb-6 lg:mx-auto lg:max-w-2xl xl:max-w-3xl">
				<div className="relative flex h-full  flex-1 items-stretch md:flex-col">
					<div className="relative flex flex-col w-full flex-grow p-4">
						<div className="relative">
							<Textarea
								rows={1}
								ref={textareaRef}
								maxRows={4}
								autoFocus
								onChange={handleInputChange}
								value={message}
								onKeyDown={(e) => {
									if (e.key === "Enter" && !e.shiftKey) {
										e.preventDefault();
										if (message.trim() === "") return;
										addMessage();

										textareaRef.current?.focus();
									}
								}}
								placeholder="Enter your question..."
								className="resize-none pr-8 text-base py-3 scrollbar-thumb-blue scrollbar-thumb-rounded scrollbar-track-blue-lighter scrollbar-w-2 scrolling-touch"
							/>

							<Button
								disabled={isLoading || isDisabled}
								className="absolute bottom-1.5 right-[8px]"
								aria-label="send message"
								onClick={() => {
									if (message.trim() === "") {
										toast.error("Message is required");
										return;
									}
									addMessage();
									textareaRef.current?.focus();
								}}>
								<Send className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</div>
				<SelectLanguage />
			</div>
		</div>
	);
};

export default ChatInput;
