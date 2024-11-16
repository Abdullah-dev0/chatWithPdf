"use client";
import { trpc } from "@/app/_trpc/client";
import { OurFileRouter } from "@/app/api/uploadthing/core";
import { UploadDropzone as Drop } from "@uploadthing/react";
import { useRouter } from "next/navigation";
import { useRef, useState, RefObject } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog";
import { toast } from "sonner";
import { Trash } from "lucide-react";
import { Loader2 } from "lucide-react";
import DeleteFile from "./DeleteFile";

const UploadDropzone = ({
	isSubscribed,
	dialogTriggerRef,
}: {
	isSubscribed: boolean;
	dialogTriggerRef: RefObject<HTMLButtonElement>;
}) => {
	const router = useRouter();
	const [isUploadComplete, setUploadIsComplete] = useState(false);

	isSubscribed = true;
	const utils = trpc.useUtils();

	const { mutate: startPolling } = trpc.getFile.useMutation({
		onSuccess: (file) => {
			if (file.uploadStatus === "SUCCESS") {
				router.push(`/dashboard/${file.id}`);
			}
			if (file.uploadStatus === "FAILED") {
				toast.error("Something went wrong while processing your file", {
					description: "Your File was uploaded successfully but we couldn't process it delete and try again",
					duration: 12000,
					action: <DeleteFile className=" w-fit" id={file.id} />,
				});
				dialogTriggerRef.current?.click();
			}
		},
		retry: true,
		retryDelay: 1000,
		onError: (err) => {
			toast.error("Something went wrong", {
				description: "Please try again later",
			});
		},
	});

	return (
		<>
			{isUploadComplete ? (
				<p className="min-h-[400px] w-full grid place-content-center text-2xl font-medium font-mono">
					Processing your PDF...⚡
				</p>
			) : (
				// @ts-ignore
				<Drop
					className="ut-label:text-lg text-white ut-allowed-content:ut-uploading:text-red-300"
					endpoint="FileUploader"
					onClientUploadComplete={(res: any) => {
						setUploadIsComplete(true);
						toast.success("File uploaded successfully");
						utils.getUserFiles.invalidate();
						startPolling({ key: res[0].key });
					}}
					onUploadError={(error: Error) => {
						alert(`ERROR! ${error.message}`);
					}}
					onChange={(files: any) => {
						if (files.length > 1) {
							toast.error("You can only upload one file at a time", {
								description: "Please try to upload one file at a time",
							});
							return;
						}
					}}
				/>
			)}
		</>
	);
};

const UploadButton = ({ isSubscribed }: { isSubscribed: boolean }) => {
	const [isOpen, setIsOpen] = useState<boolean>(false);
	const dialogTriggerRef = useRef<HTMLButtonElement>(null);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(v) => {
				if (!v) {
					setIsOpen(v);
				}
			}}>
			<DialogTrigger ref={dialogTriggerRef} onClick={() => setIsOpen(true)} asChild>
				<Button>Upload PDF</Button>
			</DialogTrigger>

			<DialogContent>
				<DialogTitle>Upload PDF</DialogTitle>
				<UploadDropzone dialogTriggerRef={dialogTriggerRef} isSubscribed={isSubscribed} />
			</DialogContent>
		</Dialog>
	);
};

export default UploadButton;
