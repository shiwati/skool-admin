"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogPortal,
	DialogTitle,
} from "@/components/ui/dialog";
import { Dialog as DialogPrimitive } from "radix-ui";
import { EMPTY, formatDateTime } from "@/lib/applicants/format";
import { formatScore, respondentLabel } from "@/lib/feedback/format";
import type { FeedbackListItem } from "@/lib/feedback/list";
import {
	QUESTIONS,
	RECOMMEND_LABELS,
	ROLE_LABELS,
	type Question,
} from "@/lib/feedback/questions";
import { cn } from "@/lib/utils";
import { RecommendBadge } from "./recommend-badge";

const iconButton =
	"flex size-8 items-center justify-center rounded-full border border-border-default hover:bg-surface-subtle focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none aria-disabled:pointer-events-none aria-disabled:opacity-40";

function ScaleRow({ question, value }: { question: Question; value: number }) {
	return (
		<div className="flex flex-col gap-1.5 border-b border-border-default py-3 last:border-0">
			<div className="flex items-baseline gap-3">
				<span className="flex-1 text-sm">
					{question.label}
					{question.reversed && (
						<span className="ml-1 text-xs text-text-tertiary">
							(fordított: az 1 a kedvező)
						</span>
					)}
				</span>
				<span className="font-mono text-sm font-medium">
					{value} / 5
				</span>
			</div>
			<div
				className="h-1.5 overflow-hidden rounded-full bg-surface-subtle"
				aria-hidden="true"
			>
				<span
					className="block h-full rounded-full bg-sky"
					style={{ width: `${value * 20}%` }}
				/>
			</div>
		</div>
	);
}

function TextRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-1 border-b border-border-default py-3 last:border-0">
			<span className="text-sm text-text-tertiary">{label}</span>
			<span className="text-sm break-words whitespace-pre-line">
				{value}
			</span>
		</div>
	);
}

function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col">
			<h3 className="pt-4 font-mono text-[11px] leading-4 font-semibold text-text-secondary uppercase">
				{title}
			</h3>
			{children}
		</section>
	);
}

function answerRows(item: FeedbackListItem, section: Question["section"]) {
	return QUESTIONS[item.role]
		.filter((q) => q.section === section && q.key !== "recommend")
		.flatMap((q) => {
			const value = item.answers[q.key];
			if (value === undefined) return [];
			if (q.kind === "scale" && typeof value === "number") {
				return [<ScaleRow key={q.key} question={q} value={value} />];
			}
			return [
				<TextRow key={q.key} label={q.label} value={String(value)} />,
			];
		});
}

/**
 * A kiválasztott visszajelzés minden válasza (terv: F02). A nyitott állapot
 * az URL `open` paramétere, így a bezárás és a lapozás is navigáció.
 */
export function FeedbackDrawer({
	item,
	closeHref,
	prevHref,
	nextHref,
}: {
	item: FeedbackListItem | null;
	closeHref: string;
	prevHref?: string;
	nextHref?: string;
}) {
	const router = useRouter();
	if (!item) return null;

	const ratings = answerRows(item, "rating");
	const statements = answerRows(item, "statement");
	const texts = answerRows(item, "text");
	const profile = answerRows(item, "profile");

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) router.replace(closeHref, { scroll: false });
			}}
		>
			<DialogPortal>
				<DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30" />
				<DialogPrimitive.Content className="fixed inset-y-0 right-0 z-50 flex w-[520px] max-w-full flex-col bg-white shadow-lg outline-none">
					<div className="flex items-start gap-2 border-b border-border-default px-4 pt-5 pb-4 md:px-6">
						<div className="flex min-w-0 flex-1 flex-col gap-1">
							<DialogTitle className="text-lg leading-7 font-bold">
								{ROLE_LABELS[item.role]} visszajelzése
							</DialogTitle>
							<DialogDescription className="text-sm text-text-secondary">
								{item.eventName} ·{" "}
								{respondentLabel(item.role, item.answers)} ·
								kitöltve{" "}
								{item.submittedAt
									? formatDateTime(item.submittedAt)
									: EMPTY}
							</DialogDescription>
						</div>
						<Link
							href={prevHref ?? "#"}
							replace
							scroll={false}
							aria-label="Előző visszajelzés"
							aria-disabled={!prevHref || undefined}
							tabIndex={prevHref ? undefined : -1}
							className={iconButton}
						>
							<ChevronLeft
								aria-hidden="true"
								className="size-4"
							/>
						</Link>
						<Link
							href={nextHref ?? "#"}
							replace
							scroll={false}
							aria-label="Következő visszajelzés"
							aria-disabled={!nextHref || undefined}
							tabIndex={nextHref ? undefined : -1}
							className={iconButton}
						>
							<ChevronRight
								aria-hidden="true"
								className="size-4"
							/>
						</Link>
						<DialogClose
							aria-label="Bezárás"
							className={cn(iconButton, "border-0")}
						>
							<X aria-hidden="true" className="size-5" />
						</DialogClose>
					</div>

					<div className="flex flex-1 flex-col overflow-y-auto px-4 pb-6 md:px-6">
						<div className="flex items-center gap-3 border-b border-border-default py-4">
							<span className="text-[32px] leading-9 font-bold">
								{formatScore(item.overallScore)}
							</span>
							<div className="flex flex-1 flex-col">
								<span className="text-sm font-medium">
									Összértékelés
								</span>
								<span className="text-xs text-text-tertiary">
									{item.role === "PARTICIPANT"
										? "a mentor- és az oktatóértékelés átlaga"
										: "a mentor saját értékelése (1–5)"}
								</span>
							</div>
							{item.recommend && (
								<RecommendBadge value={item.recommend}>
									Ajánlaná: {RECOMMEND_LABELS[item.recommend]}
								</RecommendBadge>
							)}
						</div>
						{ratings.length > 0 && (
							<Section title="Értékelések">{ratings}</Section>
						)}
						{texts.length > 0 && (
							<Section title="Szöveges válaszok">{texts}</Section>
						)}
						{statements.length > 0 && (
							<Section title="Állítások (1 = egyáltalán nem, 5 = teljesen egyetért)">
								{statements}
							</Section>
						)}
						{profile.length > 0 && (
							<Section title="Kitöltő (névtelen)">
								{profile}
							</Section>
						)}
						<p className="mt-4 rounded-[10px] bg-surface-subtle px-3 py-2 text-xs text-text-secondary">
							Forrás: a program{" "}
							{item.role === "PARTICIPANT"
								? "résztvevői"
								: "mentori"}{" "}
							visszajelző Google Sheetje. A kitöltés névtelen,
							nincs jelentkezőhöz párosítva.
						</p>
					</div>
				</DialogPrimitive.Content>
			</DialogPortal>
		</Dialog>
	);
}
