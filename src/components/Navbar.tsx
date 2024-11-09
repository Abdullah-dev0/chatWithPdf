"use client";

import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import MaxWidthWrapper from "./MaxWidthWrapper";
import MobileNav from "./MobileNav";
import { Button, buttonVariants } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

const Navbar = () => {
	const { user, isLoaded } = useUser();

	return (
		<nav className="sticky h-14 inset-x-0 top-0 z-30 w-full border-b border-gray-200 bg-white/75 backdrop-blur-lg transition-all">
			<MaxWidthWrapper>
				<div className="flex h-14 items-center justify-between border-b border-zinc-200">
					<Link href="/" className="flex z-40 font-semibold">
						<span className="text-lg">TextTalk</span>
					</Link>

					<MobileNav isAuth={!!user} />

					<div className="hidden items-center space-x-4 sm:flex">
						{!isLoaded ? (
							<>
								<Skeleton className="h-9 w-20 bg-zinc-300" />
								<Skeleton className="h-10 w-32 bg-zinc-300" />
							</>
						) : (
							<>
								<SignedOut>
									<SignInButton>
										<Button size="sm">Sign in</Button>
									</SignInButton>
									<SignInButton>
										<Button>
											Get started <ArrowRight className="ml-1.5 h-5 w-5" />
										</Button>
									</SignInButton>
								</SignedOut>

								<SignedIn>
									<Link
										href="/dashboard"
										className={buttonVariants({
											variant: "ghost",
											size: "sm",
										})}>
										Dashboard
									</Link>
									<UserButton />
								</SignedIn>
							</>
						)}
					</div>
				</div>
			</MaxWidthWrapper>
		</nav>
	);
};

export default Navbar;
