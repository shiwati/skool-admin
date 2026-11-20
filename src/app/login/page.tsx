import {
	Calendar,
	FileText,
	Lock,
	MessageSquare,
	TriangleAlert,
	Users,
	type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeCallbackPath } from "@/lib/callback-url";
import { env } from "@/lib/env";
import { getAdminSession } from "@/lib/session";
import { GoogleSignInButton } from "./google-sign-in-button";

export const metadata: Metadata = { title: "Bejelentkezés" };

type SearchParams = Record<string, string | string[] | undefined>;
type ViewState = "default" | "denied" | "error";

const accountSchema = z.email().max(254);

const modules: { label: string; icon: LucideIcon; className: string }[] = [
	{ label: "Jelentkezők", icon: Users, className: "bg-peach" },
	{ label: "Programok", icon: Calendar, className: "bg-lemon" },
	{ label: "Feedback", icon: MessageSquare, className: "bg-pink" },
	{ label: "Riportok", icon: FileText, className: "bg-lavender" },
];

function first(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value;
}

function viewState(error: string | undefined): ViewState {
	if (!error) return "default";
	return error === "AccessDenied" ? "denied" : "error";
}

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<SearchParams>;
}) {
	const params = await searchParams;
	const callbackUrl = safeCallbackPath(params.callbackUrl, env.NEXTAUTH_URL);

	if (await getAdminSession()) {
		redirect(callbackUrl);
	}

	const state = viewState(first(params.error));
	const parsedAccount = accountSchema.safeParse(first(params.account));
	const account = parsedAccount.success ? parsedAccount.data : null;
	const domain = `@${env.AUTH_ALLOWED_DOMAIN}`;

	return (
		// Desktop (xl): brand panel and sign-in side by side. Below: stacked,
		// brand band on top (boards 01.1 T / 01.1 M).
		<div className="flex min-h-screen flex-col bg-canvas text-text-primary xl:flex-row">
			<section
				aria-label="Skool admin"
				className="flex min-w-0 flex-col gap-3.5 bg-sky px-6 pt-7 pb-8 md:gap-5 md:px-14 md:pt-10 md:pb-12 xl:flex-[1_1_520px] xl:gap-6 xl:px-16 xl:py-12"
			>
				<div className="flex items-center gap-2.5 self-start md:gap-3.5">
					<Image
						src="/brand/skool-logo.png"
						alt="Skool"
						width={161}
						height={52}
						priority
						className="h-9 w-auto md:h-12 xl:h-[52px]"
					/>
					<span className="rounded-full bg-ink px-2.5 py-0.5 font-mono text-[11px] leading-4 font-semibold tracking-[0.04em] text-white uppercase">
						admin
					</span>
				</div>
				<div
					className="h-7 md:h-16 xl:h-auto xl:min-h-10 xl:flex-1"
					aria-hidden="true"
				/>
				<h1 className="max-w-[520px] text-[32px] leading-[38px] font-black md:text-[44px] md:leading-[50px] xl:text-5xl xl:leading-[54px]">
					SKOOL Menedzsment
				</h1>
				<p className="max-w-[520px] font-mono text-xs leading-4">
					Minden, ami SKOOL, jelentkezők, programok, visszajelzések és
					záró riportok – egy helyen.
				</p>
				<ul
					className="hidden flex-wrap gap-2 md:flex"
					aria-label="Modulok"
				>
					{modules.map(({ label, icon: Icon, className }) => (
						<li
							key={label}
							className={`flex items-center gap-1.5 px-3 py-2 text-xs leading-4 font-medium ${className}`}
						>
							<Icon
								className="size-3.5"
								strokeWidth={1.75}
								aria-hidden="true"
							/>
							{label}
						</li>
					))}
				</ul>
				<div className="hidden h-8 xl:block" aria-hidden="true" />
				<p className="hidden font-mono text-xs leading-4 xl:block">
					© 2026 Skool Technológiai Alapítvány · belső használatra
				</p>
			</section>

			<main className="flex min-w-0 flex-1 flex-col items-stretch gap-6 px-4 pt-6 pb-6 md:items-center md:px-6 md:pt-14 md:pb-10 xl:flex-[999_1_560px] xl:justify-center xl:py-12">
				<div className="flex w-full flex-col gap-5 rounded-[18px] border border-border-default bg-white p-6 shadow-card md:w-[480px] md:rounded-[20px] md:p-9 xl:w-[440px]">
					{" "}
					<p className="font-mono text-[11px] leading-4 font-semibold tracking-[0.04em] text-text-tertiary uppercase">
						Bejelentkezés
					</p>
					<div className="flex flex-col gap-1.5">
						<h2 className="text-2xl leading-8 font-bold tracking-[-0.01em]">
							{state === "denied"
								? "Nincs hozzáférésed"
								: "Üdv újra!"}
						</h2>
						<p className="text-sm text-text-secondary">
							Lépj be a Skool Google-fiókoddal. Külön jelszóra
							nincs szükség.
						</p>
					</div>
					{state === "denied" && (
						<Banner title="Ez a fiók nem jogosult">
							{account ? `A ${account} fiók` : "Ez a Google-fiók"}{" "}
							nem tartozik a Skool szervezethez. Lépj be {domain}{" "}
							fiókkal, vagy kérj hozzáférést az adminisztrátortól.
						</Banner>
					)}
					{state === "error" && (
						<Banner title="A bejelentkezés nem sikerült">
							Valami hiba történt a Google-bejelentkezés közben.
							Próbáld újra.
						</Banner>
					)}
					<GoogleSignInButton
						label={
							state === "denied"
								? "Másik Google-fiók választása"
								: "Bejelentkezés Google-fiókkal"
						}
						callbackUrl={callbackUrl}
					/>
					<hr className="border-border-default" />
					<p className="flex items-start gap-2.5 text-xs leading-4 text-text-tertiary">
						<Lock
							className="size-4 shrink-0"
							strokeWidth={1.75}
							aria-hidden="true"
						/>
						<span>
							Csak {domain} domainű Google-fiókkal lehet belépni.
							Minden módosítás a felhasználó nevével naplózásra
							kerül.
						</span>
					</p>
				</div>
				{/* Stacked layouts show the footer under the card; desktop shows it in the brand panel. */}
				<div className="flex-1 xl:hidden" aria-hidden="true" />
				<p className="text-center font-mono text-xs leading-4 text-text-tertiary xl:hidden">
					© 2026 Skool Technológiai Alapítvány · belső használatra
				</p>
			</main>
		</div>
	);
}

function Banner({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div
			role="alert"
			className="flex items-start gap-3 rounded-xl bg-error-bg px-4 py-3 text-error-fg"
		>
			<TriangleAlert
				className="size-[18px] shrink-0"
				strokeWidth={1.75}
				aria-hidden="true"
			/>
			<div className="flex flex-1 flex-col gap-0.5">
				<span className="text-sm font-medium">{title}</span>
				<span className="text-xs leading-4">{children}</span>
			</div>
		</div>
	);
}
