import ChatWrapper from "@/components/chat/ChatWrapper";
import PdfRenderer from "@/components/PdfRenderer";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { auth } from "@clerk/nextjs/server";

import Link from "next/link";
interface PageProps {
	params: {
		fileid: string;
	};
}

const Page = async ({ params }: PageProps) => {
	const { fileid } = params;

	const user = await auth();

	const file = await db.file.findFirst({
		where: {
			id: fileid,
			userId: user.userId,
		},
	});

	if (!file)
		return (
			<div className="flex flex-col justify-center gap-4 items-center h-[calc(100vh-3.5rem)]">
				<div className="flex flex-col items-center">
					<h2 className="text-lg font-semibold">Oops! We couldn&apos;t find the file you&apos;re looking for.</h2>
					<p className="text-gray-500">
						It might have been moved or deleted. Please check your files or try again later.
					</p>
				</div>
				<Link href="/dashboard">
					<Button>Go to Dashboard</Button>
				</Link>
			</div>
		);

	return (
		<div className="flex-1 justify-between flex flex-col h-[calc(100vh-3.5rem)]">
			<div className="mx-auto w-full max-w-8xl grow lg:flex xl:px-2">
				<div className="flex-1 xl:flex">
					<div className="px-4 py-6 sm:px-6 lg:pl-8 xl:flex-1 xl:pl-6">
						<PdfRenderer url={file.url} />
					</div>
				</div>

				<div className="shrink-0 flex-[0.75] border-t border-gray-200 lg:w-96 lg:border-l lg:border-t-0">
					<ChatWrapper file={file} />
				</div>
			</div>
		</div>
	);
};

export default Page;
