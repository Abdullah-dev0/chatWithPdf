import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function FAQ() {
	return (
		<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
			<h2 className="text-3xl font-bold mb-8 text-center text-white">Frequently Asked Questions</h2>
			<Accordion type="single" collapsible className="w-full">
				<AccordionItem value="item-1">
					<AccordionTrigger className="text-white">How does the PDF chat work?</AccordionTrigger>
					<AccordionContent className="text-gray-300">
						Our AI-powered system analyzes your uploaded PDF and uses advanced natural language processing to understand
						the content. When you ask a question, it searches the document to provide accurate and relevant answers.
					</AccordionContent>
				</AccordionItem>
				<AccordionItem value="item-2">
					<AccordionTrigger className="text-white">Is my data secure?</AccordionTrigger>
					<AccordionContent className="text-gray-300">
						Yes, we take data security very seriously. All uploaded documents are encrypted, and we do not store the
						content of your conversations. Your data is only used to provide the service and is not shared with third
						parties.
					</AccordionContent>
				</AccordionItem>
				<AccordionItem value="item-3">
					<AccordionTrigger className="text-white">What types of documents can I upload?</AccordionTrigger>
					<AccordionContent className="text-gray-300">
						Currently, we support PDF files. We&apos;re working on expanding our support to other document formats in the
						future.
					</AccordionContent>
				</AccordionItem>
				<AccordionItem value="item-4">
					<AccordionTrigger className="text-white">How accurate are the AI-generated answers?</AccordionTrigger>
					<AccordionContent className="text-gray-300">
						Our AI model is highly accurate and constantly improving. However, as with any AI system, there&apos;s a small
						margin for error. We recommend verifying important information directly in the source document.
					</AccordionContent>
				</AccordionItem>
				<AccordionItem value="item-5">
					<AccordionTrigger className="text-white">Can I use this for multiple languages?</AccordionTrigger>
					<AccordionContent className="text-gray-300">
						Yes, our system supports multiple languages. You can upload documents and ask questions in over 100
						different languages.
					</AccordionContent>
				</AccordionItem>
			</Accordion>
		</div>
	);
}
