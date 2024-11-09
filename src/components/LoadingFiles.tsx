import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function FileListSkeleton() {
	return (
		<ul className="mt-8 grid grid-cols-1 gap-6 divide-y divide-zinc-200 md:grid-cols-2 lg:grid-cols-3">
			{[...Array(6)].map((_, index) => (
				<li
					key={index}
					className="col-span-1 divide-y divide-gray-200 rounded-lg bg-white shadow transition hover:shadow-lg">
					<div className="flex flex-col gap-2">
						<div className="pt-6 px-6 flex w-full items-center justify-between space-x-6">
							<Skeleton className="h-10 w-10 rounded-full" />
							<div className="flex-1">
								<Skeleton className="h-4 w-3/4" />
							</div>
						</div>
					</div>

					<div className="px-6 mt-4 grid grid-cols-3 place-items-center py-2 gap-6 text-xs text-zinc-500">
						<div className="flex items-center gap-2">
							<Skeleton className="h-4 w-4" />
							<Skeleton className="h-4 w-16" />
						</div>

						<div className="flex items-center gap-2">
							<Skeleton className="h-4 w-4" />
							<Skeleton className="h-4 w-12" />
						</div>

						<Button size="sm" className="w-full" variant="destructive" disabled>
							<Skeleton className="h-4 w-4" />
						</Button>
					</div>
				</li>
			))}
		</ul>
	);
}
