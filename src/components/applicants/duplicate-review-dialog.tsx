"use client";

import { History } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, isAbortError } from "@/lib/api/client";
import { comparisonRows } from "@/lib/applicants/duplicate-comparison";
import {
	formatCount,
	fullName,
	STATUS_BADGE_CLASSES,
	STATUS_LABELS,
} from "@/lib/applicants/format";
import type {
	DuplicateApplicant,
	DuplicatesResponse,
} from "@/lib/applicants/types";
import { cn } from "@/lib/utils";

type Side = "a" | "b";
type Decision = "merge" | "keep";
type LoadState =
	| { status: "loading" }
	| { status: "error" }
	| { status: "success"; data: DuplicatesResponse };

const post = (url: string, body: unknown) =>
	apiFetch(url, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});

function ColumnHeader({
	side,
	applicant,
	name,
	checked,
	disabled,
	onSelect,
}: {
	side: Side;
	applicant: DuplicateApplicant;
	name: string;
	checked: boolean;
	disabled: boolean;
	onSelect: () => void;
}) {
	const latest = applicant.applications[0];
	return (
		<th
			scope="col"
			className={cn(
				"border-l border-border-default px-4 py-2.5 text-left text-sm font-medium",
				checked && "bg-sky-50",
			)}
		>
			<label
				className={cn(
					"flex flex-wrap items-center gap-2",
					disabled ? "cursor-default" : "cursor-pointer",
				)}
			>
				<input
					type="radio"
					name={name}
					checked={checked}
					disabled={disabled}
					onChange={onSelect}
					className="size-4 accent-ink"
					aria-label={`${side.toUpperCase()} adatlap megtartása`}
				/>
				{side === "a" ? "A · korábbi" : "B · újabb"}
				{latest && (
					<span
						className={cn(
							"rounded-full px-2 py-0.5 text-xs font-medium text-text-primary",
							STATUS_BADGE_CLASSES[latest.status],
						)}
					>
						{STATUS_LABELS[latest.status]}
					</span>
				)}
			</label>
		</th>
	);
}

function Option({
	name,
	checked,
	onSelect,
	title,
	description,
	disabled,
}: {
	name: string;
	checked: boolean;
	onSelect: () => void;
	title: string;
	description: string;
	disabled: boolean;
}) {
	return (
		<label
			className={cn(
				"flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3",
				checked
					? "border-ink bg-sky-50"
					: "border-border-default hover:bg-surface-subtle",
			)}
		>
			<input
				type="radio"
				name={name}
				checked={checked}
				disabled={disabled}
				onChange={onSelect}
				className="mt-0.5 size-4 accent-ink"
			/>
			<span className="flex flex-col gap-0.5">
				<span className="text-sm font-medium">{title}</span>
				<span className="text-xs text-text-secondary">
					{description}
				</span>
			</span>
		</label>
	);
}

/**
 * Duplikáció ellenőrzése (terv: 03.4): az eldöntetlen párok egyenként,
 * mezőnkénti összehasonlítással. Az admin vagy összevonja a párt (ő
 * választja ki, melyik adatlap marad), vagy "nem duplikáció"-nak jelöli.
 */
export function DuplicateReviewDialog({
	open,
	onOpenChange,
	onChanged,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Összevonás vagy elvetés után: a lista és a darabszám frissítéséhez. */
	onChanged: (remaining: number) => void;
}) {
	const groupName = useId();
	const [skip, setSkip] = useState(0);
	const [run, setRun] = useState(0);
	const [load, setLoad] = useState<LoadState>({ status: "loading" });
	const [decision, setDecision] = useState<Decision | null>(null);
	const [primary, setPrimary] = useState<Side | null>(null);
	const [pending, setPending] = useState(false);
	const [failed, setFailed] = useState(false);

	useEffect(() => {
		if (!open) return;
		// Loading state is set by whoever changes `skip`/`run` (and is the
		// initial state: the parent remounts this dialog per open).
		const controller = new AbortController();
		apiFetch<DuplicatesResponse>(
			`/api/applicants/duplicates?skip=${skip}`,
			{ signal: controller.signal },
		)
			.then((data) => {
				setLoad({ status: "success", data });
				setDecision(null);
				setPrimary(null);
				setFailed(false);
			})
			.catch((error: unknown) => {
				if (!isAbortError(error)) setLoad({ status: "error" });
			});
		return () => controller.abort();
	}, [open, skip, run]);

	const data = load.status === "success" ? load.data : null;
	const pair = data?.pair ?? null;
	const canSave =
		pair !== null &&
		!pending &&
		(decision === "keep" || (decision === "merge" && primary !== null));

	async function save() {
		if (!pair || !canSave) return;
		setPending(true);
		setFailed(false);
		try {
			if (decision === "merge") {
				const keep = primary === "a" ? pair.a : pair.b;
				const drop = primary === "a" ? pair.b : pair.a;
				await post("/api/applicants/merge", {
					primaryId: keep.id,
					mergeIds: [drop.id],
				});
				toast.success(`Összevonva: ${fullName(keep)}`);
			} else {
				await post("/api/applicants/duplicates/dismiss", {
					applicantIds: [pair.a.id, pair.b.id],
				});
				toast.success("Megjelölve: nem duplikáció");
			}
			const next = await apiFetch<DuplicatesResponse>(
				`/api/applicants/duplicates?skip=${skip}`,
			);
			onChanged(next.total);
			if (next.total === 0) {
				toast.success("Minden lehetséges duplikáció el van döntve.");
				onOpenChange(false);
				return;
			}
			setLoad({ status: "success", data: next });
			setDecision(null);
			setPrimary(null);
		} catch {
			setFailed(true);
		} finally {
			setPending(false);
		}
	}

	const title = data?.total
		? `Lehetséges duplikáció · ${formatCount(data.index + 1)} / ${formatCount(data.total)}`
		: "Lehetséges duplikáció";

	return (
		<Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
			<DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[880px]">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						{pair
							? `Azonos névvel és e-mail címmel két jelentkező: ${fullName(pair.a)}${pair.a.email ? ` · ${pair.a.email}` : ""}`
							: "Azonos névvel és e-mail címmel érkezett jelentkezők."}
					</DialogDescription>
				</DialogHeader>

				{load.status === "loading" && (
					<div className="flex flex-col gap-2" aria-busy="true">
						{Array.from({ length: 8 }, (_, i) => (
							<Skeleton key={i} className="h-8 w-full" />
						))}
					</div>
				)}

				{load.status === "error" && (
					<div
						role="alert"
						className="flex items-center gap-3 text-sm text-error-fg"
					>
						Nem sikerült betölteni a duplikációkat.
						<Button
							variant="surface"
							size="sm"
							onClick={() => {
								setLoad({ status: "loading" });
								setRun((n) => n + 1);
							}}
						>
							Újra
						</Button>
					</div>
				)}

				{data && !pair && (
					<p className="text-sm text-text-secondary">
						Nincs eldöntendő duplikáció.
					</p>
				)}

				{pair && (
					<>
						<fieldset
							className="grid gap-2 sm:grid-cols-2"
							disabled={pending}
						>
							<legend className="mb-2 text-sm font-medium sm:col-span-2">
								Mit szeretnél tenni?
							</legend>
							<Option
								name={`${groupName}-decision`}
								checked={decision === "merge"}
								onSelect={() => setDecision("merge")}
								disabled={pending}
								title="Duplikáció – összevonás"
								description="Lent, a táblázat fejlécében választod ki, melyik adatlap marad; a másik jelentkezései hozzá kerülnek, az adatlapja törlődik."
							/>
							<Option
								name={`${groupName}-decision`}
								checked={decision === "keep"}
								onSelect={() => {
									setDecision("keep");
									setPrimary(null);
								}}
								disabled={pending}
								title="Nem duplikáció – mindkét jelentkező megmarad"
								description="Pl. testvérek ugyanazzal a szülői e-mail címmel. Ez a pár nem jelenik meg újra; egy később érkező, azonos jelentkező viszont igen."
							/>
						</fieldset>
						{decision === "merge" && !primary && (
							<p className="text-xs text-warning-fg">
								Válaszd ki a táblázat fejlécében, melyik adatlap
								maradjon meg.
							</p>
						)}
						<div className="overflow-x-auto rounded-xl border border-border-default">
							<table className="w-full border-collapse text-xs">
								<thead>
									<tr className="border-b border-border-default">
										<th
											scope="col"
											className="w-[170px] bg-surface-subtle px-4 py-2.5 text-left text-sm font-medium text-text-secondary"
										>
											Mező
										</th>
										{(["a", "b"] as const).map((side) => (
											<ColumnHeader
												key={side}
												side={side}
												applicant={pair[side]}
												name={`${groupName}-primary`}
												checked={primary === side}
												disabled={
													decision !== "merge" ||
													pending
												}
												onSelect={() =>
													setPrimary(side)
												}
											/>
										))}
									</tr>
								</thead>
								<tbody>
									{comparisonRows(pair.a, pair.b).map(
										(row) => (
											<tr
												key={row.label}
												className="border-b border-border-default last:border-b-0"
											>
												<th
													scope="row"
													className="bg-surface-subtle px-4 py-2.5 text-left font-medium text-text-secondary"
												>
													{row.label}
												</th>
												{[row.a, row.b].map(
													(value, i) => (
														<td
															key={i}
															className={cn(
																"border-l border-border-default px-4 py-2.5 break-words",
																row.differs &&
																	"bg-warning-bg text-warning-fg",
															)}
														>
															{value}
														</td>
													),
												)}
											</tr>
										),
									)}
								</tbody>
							</table>
						</div>
						<div className="flex items-center gap-2 text-xs text-text-secondary">
							<span
								aria-hidden="true"
								className="size-3 rounded-[3px] border border-warning-fg bg-warning-bg"
							/>
							Eltérő mezők kiemelve
						</div>

						<div className="flex items-center gap-2 text-xs text-text-tertiary">
							<History aria-hidden="true" className="size-3.5" />A
							döntés a változásnaplóba kerül a neveddel.
						</div>
						{failed && (
							<p role="alert" className="text-sm text-error-fg">
								A döntés mentése nem sikerült. Próbáld újra.
							</p>
						)}
					</>
				)}

				<DialogFooter className="items-center gap-2 sm:justify-between">
					<Button
						variant="ghost"
						disabled={pending || !data || data.total < 2}
						onClick={() => {
							setLoad({ status: "loading" });
							setSkip((n) => n + 1);
						}}
					>
						Kihagyás most
					</Button>
					<div className="flex gap-2">
						<Button
							variant="surface"
							disabled={pending}
							onClick={() => onOpenChange(false)}
						>
							Mégse
						</Button>
						<Button
							disabled={!canSave}
							aria-busy={pending || undefined}
							onClick={() => void save()}
						>
							Döntés mentése és következő
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
