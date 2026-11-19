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
		<div className="flex min-h-screen flex-wrap bg-canvas text-text-primary">
			<section
				aria-label="Skool admin"
				className="flex min-w-0 flex-[1_1_520px] flex-col gap-6 bg-sky px-6 py-10 sm:px-16 sm:py-12"
			>
				<div className="flex items-center gap-3.5 self-start">
					<Image
						src="/brand/skool-logo.png"
						alt="Skool"
						width={161}
						height={52}
						priority
						className="h-[52px] w-auto"
					/>
					<span className="rounded-full bg-ink px-2.5 py-0.5 font-mono text-[11px] leading-4 font-semibold tracking-[0.04em] text-white uppercase">
						admin
					</span>
				</div>
				<div className="min-h-10 flex-1" aria-hidden="true" />
				<h1 className="max-w-[500px] text-[40px] leading-[46px] font-black sm:text-5xl sm:leading-[54px]">
					SKOOL Menedzsment
				</h1>
				<p className="max-w-[500px] font-mono text-xs leading-4">
					Minden, ami SKOOL, jelentkezők, programok, visszajelzések és
					záró riportok – egy helyen.
				</p>
				<ul className="flex flex-wrap gap-2" aria-label="Modulok">
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
				<div className="h-8" aria-hidden="true" />
				<p className="font-mono text-xs leading-4">
					© 2026 Skool Technológiai Alapítvány · belső használatra
				</p>
			</section>

			<main className="flex min-w-0 flex-[999_1_560px] items-center justify-center px-4 py-12 sm:px-6">
				<div className="flex w-[440px] max-w-full flex-col gap-5 rounded-[20px] border border-border-default bg-white p-6 shadow-card sm:p-9">
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
