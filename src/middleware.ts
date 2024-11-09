import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { db } from "./db";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

//by default, all routes are protected

const isPublicRoute = createRouteMatcher([
	"/sign-in(.*)",
	"/sign-up(.*)",
	"/",
	"/api/webhooks(.*)",
	"/api/uploadthing(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
	if (!isPublicRoute(request)) {
		await auth.protect();
	}

	const user = await auth();
	const url = request.nextUrl.clone();
	url.pathname = "/dashboard";
	if (user.userId && request.nextUrl.pathname === "/") {
		return NextResponse.rewrite(url);
	}

	return NextResponse.next();
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};
