import { trpc } from "@/app/_trpc/client";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Loader2, Trash } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type DeleteFileProps = {
	id: string;
	className?: string;
};

export default function DeleteFile({ id, className }: DeleteFileProps) {
	const [currentlyDeletingFile, setCurrentlyDeletingFile] = useState<string | null>(null);

	const utils = trpc.useUtils();
	const { mutate: deleteFile } = trpc.deleteFile.useMutation({
		onSuccess: () => {
			utils.getUserFiles.invalidate();
			toast.success("File deleted successfully", {
				description: `The file has been deleted successfully at ${new Date().toLocaleString()}`,
			});
		},
		onMutate({ id }) {
			setCurrentlyDeletingFile(id);
		},
		onSettled() {
			setCurrentlyDeletingFile(null);
		},
		onError(error) {
			toast.error(error.message);
			setCurrentlyDeletingFile(null);
		},
	});

	return (
		<Button onClick={() => deleteFile({ id })} size="sm" className={cn("w-full", className)} variant="destructive">
			{currentlyDeletingFile === id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash className="h-4 w-4" />}
		</Button>
	);
}
