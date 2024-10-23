import * as React from "react";

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { languages } from "@/constant/stripe";

export default function SelectLanguage() {
	return (
		<Select defaultValue="language">
			<SelectTrigger className="w-[280px] focus:ring-0 focus:ring-offset-0 !ring-0 !ring-offset-0">
				<SelectValue placeholder="Select a timezone" />
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
