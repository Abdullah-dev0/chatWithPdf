export default function RootLayout({ children }: { children: React.ReactNode }) {
	return <main className="h-screen grid place-content-center">{children}</main>;
}
