import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
	title: { default: "Application", template: "%s | Application" },
	description: "Application foundation",
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en">
			<body className="min-h-screen bg-background font-sans text-foreground antialiased">
				{children}
			</body>
		</html>
	);
}
