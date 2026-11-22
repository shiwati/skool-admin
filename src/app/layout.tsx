import type { Metadata, Viewport } from "next";
import { Azeret_Mono, Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { noIndexRobots } from "@/lib/no-index";
import "./globals.css";

const poppins = Poppins({
	subsets: ["latin", "latin-ext"],
	weight: ["400", "500", "600", "700", "900"],
	variable: "--font-poppins",
	display: "swap",
});

const azeretMono = Azeret_Mono({
	subsets: ["latin", "latin-ext"],
	weight: ["400", "500", "600"],
	variable: "--font-azeret-mono",
	display: "swap",
});

export const metadata: Metadata = {
	title: { default: "SKOOL Menedzsment", template: "%s | SKOOL Menedzsment" },
	description: "A Skool belső admin felülete",
	robots: noIndexRobots,
};

// `viewport-fit=cover` lets the mobile bottom navigation pad itself with
// `env(safe-area-inset-bottom)` on phones with a home indicator.
export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html
			lang="hu"
			className={`${poppins.variable} ${azeretMono.variable}`}
		>
			<body className="min-h-screen bg-background font-sans text-foreground antialiased">
				{children}
				<Toaster position="bottom-right" />
			</body>
		</html>
	);
}
