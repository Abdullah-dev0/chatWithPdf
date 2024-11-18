"use client";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { languages } from "@/constant";
import { useContext } from "react";
import { ChatContext } from "./ChatContext";

export default function SelectLanguage() {
	const { language, setLanguage } = useContext(ChatContext);
	return (
		<Select defaultValue={language}
		 value={language} 
		 onValueChange={setLanguage}>
			<SelectTrigger className=" w-[100px] focus:ring-0 focus:ring-offset-0 !ring-0 !ring-offset-0">
				<SelectValue placeholder="Select a Language" />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					<SelectLabel>languages</SelectLabel>
					{languages.map((lang) => (
						<SelectItem key={lang.id} value={lang.language}>
							{lang.language}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
}
