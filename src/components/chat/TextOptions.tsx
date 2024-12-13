"use client";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageLoadingStates, MessageUpdate } from "@/types/message";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

type OptionType = MessageUpdate["type"];

interface TextOptionsProps {
	text: string;
	id: string;
	onUpdateMessage: (update: MessageUpdate) => void;
	onLoadingStateChange: (state: MessageLoadingStates) => void;
}

export default function TextOptions({ text, id, onUpdateMessage, onLoadingStateChange }: TextOptionsProps) {
	const handleOptionSelect = async (option: Capitalize<OptionType>) => {
		const type = option.toLowerCase() as OptionType;
		onLoadingStateChange({ [type]: true });

		try {
			const response = await fetch("/api/summarize", {
				method: "POST",
				body: JSON.stringify({ text, option, id }),
			});

			if (!response.ok) throw new Error("Request failed");

			const result = await response.json();

			onUpdateMessage({
				type,
				content: result.content,
			});
		} catch (error) {
			toast.error(`There was an error while ${type}ing this text`, {
				description: "Please try again later",
				duration: 5000,
			});
		} finally {
			onLoadingStateChange({ [type]: false });
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild className="mb-2 cursor-pointer">
				<MoreHorizontal className="h-5 w-5" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="bg-slate-700 text-white">
				<DropdownMenuItem
					onSelect={() => handleOptionSelect("Summarize")}
					className="hover:bg-transparent focus:bg-transparent hover:text-white cursor-pointer">
					Summarize this text
				</DropdownMenuItem>
				<DropdownMenuItem
					onSelect={() => handleOptionSelect("Paraphrase")}
					className="hover:bg-transparent focus:bg-transparent cursor-pointer">
					Paraphrase this text
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
