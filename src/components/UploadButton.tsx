"use client";
import { trpc } from "@/app/_trpc/client";
import { OurFileRouter } from "@/app/api/uploadthing/core";
import { UploadDropzone as Drop } from "@uploadthing/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { toast } from "sonner";

const UploadDropzone = ({ isSubscribed }: { isSubscribed: boolean }) => {
	const router = useRouter();
	const [isUploadComplete, setUploadIsComplete] = useState(false);

	isSubscribed = true;
	const utils = trpc.useUtils();

	const { mutate: startPolling } = trpc.getFile.useMutation({
		onSuccess: (file) => {
			router.push(`/dashboard/${file.id}`);
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
					Redirecting to Chat Page..😁
				</p>
			) : (
				<Drop<OurFileRouter, any>
					className="ut-label:text-lg text-white ut-allowed-content:ut-uploading:text-red-300"
					endpoint={isSubscribed ? "proPlanUploader" : "freePlanUploader"}
					onClientUploadComplete={(res) => {
						setUploadIsComplete(true);
						utils.getUserFiles.invalidate();
						startPolling({ key: res[0].key });
					}}
					onUploadError={(error: Error) => {
						toast.error(error.message, {
							description: "Please try again later",
						});
						document.getElementById("upload-dialog")?.click();
					}}
					onChange={(files) => {
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

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(v) => {
				if (!v) {
					setIsOpen(v);
				}
			}}>
			<DialogTrigger id="upload-dialog" onClick={() => setIsOpen(true)} asChild>
				<Button>Upload PDF</Button>
			</DialogTrigger>

			<DialogContent>
				<UploadDropzone isSubscribed={isSubscribed} />
			</DialogContent>
		</Dialog>
	);
};

export default UploadButton;
