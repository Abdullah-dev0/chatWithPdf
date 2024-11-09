"use client";

import { trpc } from "@/app/_trpc/client";
import { format } from "date-fns";
import { Ghost, Loader2, MessageSquare, Plus, Trash } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import LoadingFiles from "./LoadingFiles";
import { Button } from "./ui/button";
import { toast } from "sonner";

const FilesCard = () => {
	const [currentlyDeletingFile, setCurrentlyDeletingFile] = useState<string | null>(null);

	const utils = trpc.useUtils();

	const { data: files, isFetching } = trpc.getUserFiles.useQuery(undefined, {
		staleTime: 1000 * 60 * 5,

		retry(failureCount, error) {
			if (error.message === "unauthorized") return false;
			return failureCount < 3;
		},
	});

	const { mutate: deleteFile } = trpc.deleteFile.useMutation({
		onSuccess: (id) => {
			utils.getUserFiles.ensureData();

			utils.getUserFiles.setData(undefined, (oldData) => {
				if (!oldData) return [];
				return oldData.filter((file) => file.id !== id);
			});

			toast.success("File deleted successfully", {
				description: `The file has been deleted successfully at ${new Date().toLocaleTimeString()}`,
			});
		},
		onMutate({ id }) {
			setCurrentlyDeletingFile(id);
		},
		onSettled() {
			setCurrentlyDeletingFile(null);
		},
	});

	if (files?.length === 0) {
		return (
			<div className="mt-16 flex flex-col items-center gap-2">
				<Ghost className="h-8 w-8 text-zinc-800" />
				<h3 className="font-semibold text-xl">Pretty empty around here</h3>
				<p>Let&apos;s upload your first PDF.</p>
			</div>
		);
	}

	if (isFetching) {
		return (
			<div className="flex flex-col items-center gap-2">
				<LoadingFiles />
			</div>
		);
	}

	return (
		<>
			{files && files?.length !== 0 && (
				<ul className="mt-8 grid grid-cols-1 gap-6 divide-y divide-zinc-200 md:grid-cols-2 lg:grid-cols-3">
					{files
						.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
						.map((file) => (
							<li
								key={file.id}
								className="col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow transition hover:shadow-lg">
								<Link href={`/dashboard/${file.id}`} className="flex flex-col gap-2">
									<div className=" pt-6 px-6 flex w-full items-center justify-between space-x-6">
										<div className="h-10 w-10 flex-shrink-0 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
										<div className="flex-1 truncate">
											<div className="flex items-center space-x-3">
												<h3 className="truncate text-lg font-medium text-zinc-900">{file.name}</h3>
											</div>
										</div>
									</div>
								</Link>

								<div className="px-6 mt-4 grid grid-cols-3 place-items-center py-2 gap-6 text-xs text-zinc-500">
									<div className="flex items-center gap-2">
										<Plus className="h-4 w-4" />
										{format(new Date(file.createdAt), "MMM yyyy")}
									</div>

									<div className="flex items-center gap-2">
										<MessageSquare className="h-4 w-4" />
										mocked
									</div>

									<Button
										onClick={() => deleteFile({ id: file.id })}
										size="sm"
										className="w-full"
										variant="destructive">
										{currentlyDeletingFile === file.id ? (
											<Loader2 className="h-4 w-4 animate-spin" />
										) : (
											<Trash className="h-4 w-4" />
										)}
									</Button>
								</div>
							</li>
						))}
				</ul>
			)}
		</>
	);
};

export default FilesCard;
