import { type ClassValue, clsx } from "clsx";
import { Metadata } from "next";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function absoluteUrl(path: string) {
	if (typeof window !== "undefined") return path;
	if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}${path}`;
	return `http://localhost:${process.env.PORT ?? 3000}${path}`;
}

export function constructMetadata({
	title = "TextTalk - Chat With Your PDFs",
	description = "TextTalk is an open-source software to make chatting to your PDF files easy.",
	image = "/thumbnail.png",
	icons = "/favicon.ico",
	noIndex = false,
}: {
	title?: string;
	description?: string;
	image?: string;
	icons?: string;
	noIndex?: boolean;
} = {}): Metadata {
	return {
		title,
		description,
		openGraph: {
			title,
			description,
			type: "website",
			url: "https://texttalk.techonline.live",
			images: [
				{
					url: image,
					width: 1200,
					height: 630,
					alt: title,
				},
			],
			siteName: "TextTalk",
			locale: "en_US",
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
			images: [image],
			creator: "@Abdu_lah14",
		},
		icons: {
			icon: icons,
			shortcut: icons,
			apple: icons,
		},
		themeColor: "#FFF",
		manifest: "/manifest.json",
		keywords: ["PDF chat", "document analysis", "AI chat", "text analysis"],
		authors: [
			{
				name: "Abdullah",
				url: "https://Abdullahtech.me",
			},
		],
		...(noIndex && {
			robots: {
				index: false,
				follow: false,
			},
		}),
	};
}
