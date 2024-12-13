import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { db } from "./db";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

const MAINTENANCE_MODE = "true";

//by default, all routes are protected

const isPublicRoute = createRouteMatcher([
	"/sign-in(.*)",
	"/sign-up(.*)",
	"/",
	"/api/webhooks(.*)",
	"/maintenance",
	"/api/uploadthing(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
	// redirect theuser to maintenance page

	if (MAINTENANCE_MODE === "true" && request.nextUrl.pathname !== "/maintenance") {
		return NextResponse.redirect(new URL("/maintenance", request.url));
	}

	return NextResponse.next();

	// if (!isPublicRoute(request)) {
	// 	await auth.protect();
	// }

	// const user = await auth();
	// const url = request.nextUrl.clone();
	// url.pathname = "/dashboard";

	// if (user.userId && request.nextUrl.pathname === "/") {
	// 	return NextResponse.redirect(new URL("/dashboard", request.url));
	// }

	// return NextResponse.next();
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};
