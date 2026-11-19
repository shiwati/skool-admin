import type { Metadata } from "next";
import { Azeret_Mono, Poppins } from "next/font/google";
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
			</body>
		</html>
	);
}
