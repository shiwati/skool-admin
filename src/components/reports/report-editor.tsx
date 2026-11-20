"use client";

import { ExternalLink, FileText, Plus, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DetailCard } from "@/components/applicants/detail/detail-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, apiFetch } from "@/lib/api/client";
import { formatDateTime } from "@/lib/applicants/format";
import {
	MAX_HIGHLIGHTED,
	MAX_PEOPLE,
	MAX_QUOTES,
	quoteId,
	type ReportContent,
} from "@/lib/reports/content";
import type { FeedbackRoleKey } from "@/lib/feedback/questions";
import { cn } from "@/lib/utils";

export type EditorCandidate = {
	id: string;
	feedbackId: string;
	questionKey: string;
	role: FeedbackRoleKey;
	questionLabel: string;
	text: string;
};

export type EditorMetric = {
	key: string;
	label: string;
	percent: number | null;
	answered: number;
};

export type EditorDocument = {
	id: string;
	title: string;
	docUrl: string;
	createdAt: string;
	createdBy: string | null;
};

const ROLE_LABELS: Record<FeedbackRoleKey, string> = {
	PARTICIPANT: "Résztvevő",
	MENTOR: "Mentor",
};

function errorMessage(error: unknown, fallback: string): string {
	if (error instanceof ApiError) {
		const message = (error.body as { error?: unknown } | undefined)?.error;
		if (typeof message === "string" && error.status !== 500) return message;
	}
	return fallback;
}

export function ReportEditor({
	eventId,
	initialContent,
	candidates,
	metrics,
	documents,
}: {
	eventId: string;
	initialContent: ReportContent;
	candidates: EditorCandidate[];
	metrics: EditorMetric[];
	documents: EditorDocument[];
}) {
	const router = useRouter();
	const [content, setContent] = useState(initialContent);
	const [pending, setPending] = useState<"save" | "generate" | null>(null);
	const [created, setCreated] = useState<EditorDocument | null>(null);

	const base = `/api/events/${encodeURIComponent(eventId)}/report`;
	const selected = new Map(content.quotes.map((q) => [quoteId(q), q]));
	const highlightedCount = content.quotes.filter((q) => q.highlighted).length;
	const disabledMetrics = new Set(content.disabledMetrics);
	// Validated on the server too; here only so the buttons can explain it.
	const peopleInvalid = content.people.some(
		(p) => !p.role.trim() || !p.name.trim(),
	);
	const quotesInvalid = content.quotes.some((q) => !q.text.trim());
	const invalid = peopleInvalid || quotesInvalid;

	function update(patch: Partial<ReportContent>) {
		setContent((current) => ({ ...current, ...patch }));
	}

	function toggleQuote(candidate: EditorCandidate, checked: boolean) {
		update({
			quotes: checked
				? [
						...content.quotes,
						{
							feedbackId: candidate.feedbackId,
							questionKey: candidate.questionKey,
							text: candidate.text,
							highlighted: false,
						},
					]
				: content.quotes.filter((q) => quoteId(q) !== candidate.id),
		});
	}

	function patchQuote(
		id: string,
		patch: Partial<{ text: string; highlighted: boolean }>,
	) {
		update({
			quotes: content.quotes.map((q) =>
				quoteId(q) === id ? { ...q, ...patch } : q,
			),
		});
	}

	async function save() {
		if (pending) return;
		setPending("save");
		try {
			await apiFetch(base, {
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ content }),
			});
			toast.success("A riport adatai elmentve.");
			router.refresh();
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) return;
			toast.error(errorMessage(error, "A mentés nem sikerült."));
		} finally {
			setPending(null);
		}
	}

	async function generate() {
		if (pending) return;
		setPending("generate");
		setCreated(null);
		try {
			const doc = await apiFetch<Omit<EditorDocument, "createdBy">>(
				`${base}/documents`,
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ content }),
				},
			);
			setCreated({ ...doc, createdBy: null });
			toast.success("A Google Doc elkészült.");
			router.refresh();
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) return;
			toast.error(
				errorMessage(
					error,
					"A Google Doc nem készült el. Próbáld újra.",
				),
			);
		} finally {
			setPending(null);
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<DetailCard
				title="Közreműködők · „Kik vettek részt?”"
				subtitle="Az oktatóból és a mentorokból előre kitöltve; a szerep és a szervezet szerkeszthető."
			>
				{content.people.length === 0 ? (
					<p className="text-sm text-text-secondary">
						Még nincs közreműködő. A riportba helyőrző kerül.
					</p>
				) : (
					<ul className="flex flex-col gap-2">
						{content.people.map((person, index) => (
							<li
								key={index}
								className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)_auto]"
							>
								{(
									[
										["role", "Szerep"],
										["organization", "Szervezet"],
										["name", "Név"],
									] as const
								).map(([field, label]) => (
									<Input
										key={field}
										aria-label={`${label} (${index + 1}. sor)`}
										placeholder={label}
										value={person[field]}
										aria-invalid={
											field !== "organization" &&
											!person[field].trim()
												? true
												: undefined
										}
										onChange={(e) =>
											update({
												people: content.people.map(
													(p, i) =>
														i === index
															? {
																	...p,
																	[field]:
																		e.target
																			.value,
																}
															: p,
												),
											})
										}
									/>
								))}
								<Button
									type="button"
									variant="ghost"
									size="icon"
									aria-label={`${index + 1}. sor törlése`}
									onClick={() =>
										update({
											people: content.people.filter(
												(_, i) => i !== index,
											),
										})
									}
								>
									<Trash2 aria-hidden="true" />
								</Button>
							</li>
						))}
					</ul>
				)}
				<Button
					type="button"
					variant="surface"
					size="sm"
					className="self-start"
					disabled={content.people.length >= MAX_PEOPLE}
					onClick={() =>
						update({
							people: [
								...content.people,
								{
									role: "Önkéntes",
									organization: "",
									name: "",
								},
							],
						})
					}
				>
					<Plus aria-hidden="true" />
					Közreműködő hozzáadása
				</Button>
			</DetailCard>

			<DetailCard
				title="Idézetek a visszajelzésekből"
				subtitle={`Pipa: a riportba kerül (max. ${MAX_QUOTES}) · ★: kiemelt idézet a 2. oldal tetején (max. ${MAX_HIGHLIGHTED}). Csak a szerep jelenik meg, név soha.`}
				aside={
					<span className="font-mono text-xs text-text-secondary">
						{content.quotes.length} / {MAX_QUOTES} · ★{" "}
						{highlightedCount} / {MAX_HIGHLIGHTED}
					</span>
				}
			>
				{candidates.length === 0 ? (
					<p className="text-sm text-text-secondary">
						Ehhez a programhoz még nincs szöveges visszajelzés.
						Előbb szinkronizáld a visszajelzéseket.
					</p>
				) : (
					<ul className="flex flex-col divide-y divide-border-default">
						{candidates.map((candidate) => {
							const quote = selected.get(candidate.id);
							const checkboxId = `quote-${candidate.id}`;
							return (
								<li
									key={candidate.id}
									className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
								>
									<div className="flex items-start gap-3">
										<Checkbox
											id={checkboxId}
											className="mt-0.5"
											checked={Boolean(quote)}
											disabled={
												!quote &&
												content.quotes.length >=
													MAX_QUOTES
											}
											onCheckedChange={(checked) =>
												toggleQuote(
													candidate,
													checked === true,
												)
											}
										/>
										<label
											htmlFor={checkboxId}
											className="flex min-w-0 grow flex-col gap-0.5"
										>
											<span className="text-sm break-words">
												„{candidate.text}”
											</span>
											<span className="text-xs text-text-tertiary">
												{ROLE_LABELS[candidate.role]} ·{" "}
												{candidate.questionLabel}
											</span>
										</label>
										{quote && (
											<button
												type="button"
												aria-pressed={quote.highlighted}
												aria-label="Kiemelt idézet"
												title="Kiemelt idézet"
												disabled={
													!quote.highlighted &&
													highlightedCount >=
														MAX_HIGHLIGHTED
												}
												onClick={() =>
													patchQuote(candidate.id, {
														highlighted:
															!quote.highlighted,
													})
												}
												className="rounded p-1 disabled:cursor-not-allowed disabled:opacity-40"
											>
												<Star
													aria-hidden="true"
													className={cn(
														"size-5",
														quote.highlighted
															? "fill-[#B7791F] text-[#B7791F]"
															: "text-text-tertiary",
													)}
												/>
											</button>
										)}
									</div>
									{quote && (
										<Textarea
											aria-label="Az idézet szövege a riportban"
											className="ml-7 w-[calc(100%-1.75rem)]"
											value={quote.text}
											aria-invalid={
												!quote.text.trim() || undefined
											}
											onChange={(e) =>
												patchQuote(candidate.id, {
													text: e.target.value,
												})
											}
										/>
									)}
								</li>
							);
						})}
					</ul>
				)}
			</DetailCard>

			<DetailCard
				title="A hatás számokban"
				subtitle="A résztvevői visszajelzésekből: a 4–5 (fordított állításnál 1–2) vagy „igen” válaszok aránya. Adat nélküli mutató nem kerül a riportba."
			>
				<ul className="flex flex-col divide-y divide-border-default">
					{metrics.map((metric) => {
						const noData = metric.percent === null;
						const id = `metric-${metric.key}`;
						return (
							<li
								key={metric.key}
								className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
							>
								<Checkbox
									id={id}
									checked={
										!noData &&
										!disabledMetrics.has(metric.key)
									}
									disabled={noData}
									onCheckedChange={(checked) =>
										update({
											disabledMetrics:
												checked === true
													? content.disabledMetrics.filter(
															(k) =>
																k !==
																metric.key,
														)
													: [
															...content.disabledMetrics,
															metric.key,
														],
										})
									}
								/>
								<label htmlFor={id} className="grow text-sm">
									{metric.label}
								</label>
								<span
									className={cn(
										"rounded-full px-2 font-mono text-xs leading-6 font-medium whitespace-nowrap",
										noData
											? "bg-warning-bg text-warning-fg"
											: "bg-success-bg text-success-fg",
									)}
								>
									{noData
										? "nincs adat"
										: `${metric.percent}% · ${metric.answered} válasz`}
								</span>
							</li>
						);
					})}
				</ul>
			</DetailCard>

			<DetailCard
				title="Google Doc"
				subtitle="Minden generálás új dokumentumot hoz létre a saját Google Drive-odban. A szabad szövegeket (bevezető, „Mit csináltunk?”, fotók) a Docsban kell megírni; PDF-et is onnan exportálj."
			>
				{created && (
					<div
						role="status"
						className="flex flex-wrap items-center gap-3 rounded-xl border border-info-fg/30 bg-info-bg p-3 text-sm"
					>
						<span className="grow">
							<b>A dokumentum a saját Google Drive-odba került</b>{" "}
							(„Saját meghajtó”), és csak te látod, amíg meg nem
							osztod.
						</span>
						<Button asChild variant="surface" size="sm">
							<a
								href={created.docUrl}
								target="_blank"
								rel="noreferrer"
							>
								Megnyitás a Docsban
								<ExternalLink aria-hidden="true" />
							</a>
						</Button>
					</div>
				)}
				<div className="flex flex-wrap gap-2">
					<Button
						type="button"
						variant="surface"
						disabled={pending !== null || invalid}
						aria-busy={pending === "save" || undefined}
						onClick={() => void save()}
					>
						Mentés
					</Button>
					<Button
						type="button"
						disabled={pending !== null || invalid}
						aria-busy={pending === "generate" || undefined}
						onClick={() => void generate()}
					>
						<FileText aria-hidden="true" />
						{pending === "generate"
							? "Google Doc létrehozása…"
							: "Google Doc generálása"}
					</Button>
				</div>
				{invalid && (
					<p className="text-sm text-error-fg">
						Töltsd ki a közreműködők szerepét és nevét, és ne hagyj
						üres idézetet.
					</p>
				)}
				{documents.length > 0 && (
					<div className="flex flex-col gap-2">
						<h3 className="text-sm font-semibold">
							Korábban generált dokumentumok
						</h3>
						<ul className="flex flex-col divide-y divide-border-default rounded-xl border border-border-default">
							{documents.map((doc) => (
								<li
									key={doc.id}
									className="flex flex-wrap items-center gap-3 px-3 py-2.5"
								>
									<FileText
										aria-hidden="true"
										className="size-4 text-info-fg"
									/>
									<span className="flex min-w-0 grow flex-col">
										<span className="text-sm font-medium break-words">
											{doc.title}
										</span>
										<span className="text-xs text-text-tertiary">
											{formatDateTime(doc.createdAt)}
											{doc.createdBy &&
												` · ${doc.createdBy}`}
										</span>
									</span>
									<a
										href={doc.docUrl}
										target="_blank"
										rel="noreferrer"
										className="inline-flex items-center gap-1 text-sm text-info-fg underline-offset-2 hover:underline"
									>
										Megnyitás
										<ExternalLink
											aria-hidden="true"
											className="size-3.5"
										/>
									</a>
								</li>
							))}
						</ul>
						<p className="text-xs text-text-tertiary">
							A dokumentumok annak a Drive-jában vannak, aki
							generálta őket.
						</p>
					</div>
				)}
			</DetailCard>
		</div>
	);
}
