"use client";

import { Copy } from "lucide-react";
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
import { apiFetch, isAbortError } from "@/lib/api/client";
import { buildEmailList, formatCount } from "@/lib/applicants/format";
import { toApiQuery, type ListState } from "@/lib/applicants/list-params";
import type { ApplicantsPage } from "@/lib/applicants/types";
import { copyText } from "@/lib/clipboard";

/** Az API legnagyobb lapmérete. */
const FETCH_PAGE_SIZE = 100;

type LoadState =
	| { status: "loading"; loaded: number; total: number | null }
	| { status: "error" }
	| { status: "done"; text: string; count: number };

/** Egy lap e-mail címe és a találatok teljes száma. */
export type EmailPage = { emails: (string | null)[]; total: number };

/** Egy lap lekérése (1-től számozva, `FETCH_PAGE_SIZE` mérettel). */
export type EmailPageFetcher = (
	page: number,
	pageSize: number,
	signal: AbortSignal,
) => Promise<EmailPage>;

/** Lapozva összegyűjti egy lista összes e-mail címét. */
export async function collectEmailPages(
	fetchPage: EmailPageFetcher,
	signal: AbortSignal,
	onProgress: (loaded: number, total: number) => void,
): Promise<{ text: string; count: number }> {
	const emails: (string | null)[] = [];
	let page = 1;
	for (;;) {
		const data = await fetchPage(page, FETCH_PAGE_SIZE, signal);
		emails.push(...data.emails);
		const loaded = Math.min(page * FETCH_PAGE_SIZE, data.total);
		onProgress(loaded, data.total);
		if (data.emails.length === 0 || loaded >= data.total) break;
		page += 1;
	}
	return buildEmailList(emails);
}

/** A Jelentkezők lista szűrésének lapjai a `GET /api/applicants`-ből. */
export function applicantsEmailPages(state: ListState): EmailPageFetcher {
	return async (page, pageSize, signal) => {
		const data = await apiFetch<ApplicantsPage>(
			`/api/applicants?${toApiQuery(state, { page, pageSize })}`,
			{ signal },
		);
		return {
			emails: data.items.map((item) => item.email),
			total: data.total,
		};
	};
}

/**
 * Az aktuális szűrés összes találatának e-mail címe (minden oldalról),
 * lapozva gyűjtve a `GET /api/applicants`-ből.
 */
export function collectEmails(
	state: ListState,
	signal: AbortSignal,
	onProgress: (loaded: number, total: number) => void,
): Promise<{ text: string; count: number }> {
	return collectEmailPages(applicantsEmailPages(state), signal, onProgress);
}

export function EmailListDialog({
	open,
	onOpenChange,
	state,
	fetchPage,
	description = "Az aktuális szűrésnek megfelelő összes jelentkező e-mail címe, vesszővel elválasztva.",
}: {
	open: boolean;
	description?: string;
	onOpenChange: (open: boolean) => void;
} & (
	| { state: ListState; fetchPage?: never }
	| { state?: never; fetchPage: EmailPageFetcher }
)) {
	const [load, setLoad] = useState<LoadState>({
		status: "loading",
		loaded: 0,
		total: null,
	});
	const [attempt, setAttempt] = useState(0);
	const textId = useId();

	// The parent remounts the dialog each time it opens (via `key`), so the
	// initial "loading" state never has to be reset here; a retry resets it
	// in its click handler.
	useEffect(() => {
		if (!open) return;
		const controller = new AbortController();
		const source = fetchPage ?? applicantsEmailPages(state as ListState);
		collectEmailPages(source, controller.signal, (loaded, total) => {
			if (!controller.signal.aborted)
				setLoad({ status: "loading", loaded, total });
		})
			.then((result) => {
				if (!controller.signal.aborted)
					setLoad({ status: "done", ...result });
			})
			.catch((error: unknown) => {
				if (controller.signal.aborted || isAbortError(error)) return;
				setLoad({ status: "error" });
			});
		// Closing the dialog (Mégse / Esc) cancels the remaining requests.
		return () => controller.abort();
	}, [open, state, fetchPage, attempt]);

	async function copy(text: string, count: number) {
		if (await copyText(text)) {
			toast.success(
				`${formatCount(count)} db e-mail cím a vágólapra másolva`,
			);
		} else {
			toast.error(
				"Nem sikerült a vágólapra másolni. Jelöld ki és másold kézzel.",
			);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>E-mail lista</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				{load.status === "loading" && (
					<p role="status" className="text-sm text-text-secondary">
						Címek gyűjtése…
						{load.total !== null &&
							` ${formatCount(load.loaded)} / ${formatCount(load.total)}`}
					</p>
				)}

				{load.status === "error" && (
					<div
						role="alert"
						className="flex flex-col items-start gap-2"
					>
						<p className="text-sm text-error-fg">
							Nem sikerült összegyűjteni a címeket.
						</p>
						<Button
							variant="surface"
							size="sm"
							onClick={() => {
								setLoad({
									status: "loading",
									loaded: 0,
									total: null,
								});
								setAttempt((n) => n + 1);
							}}
						>
							Újrapróbálás
						</Button>
					</div>
				)}

				{load.status === "done" &&
					(load.count === 0 ? (
						<p className="text-sm text-text-secondary">
							Nincs másolható e-mail cím a szűrésnek megfelelő
							jelentkezők között.
						</p>
					) : (
						<div className="flex flex-col gap-1.5">
							<label
								htmlFor={textId}
								className="text-xs font-medium"
							>
								{formatCount(load.count)} db e-mail cím
							</label>
							<textarea
								id={textId}
								readOnly
								value={load.text}
								rows={8}
								onFocus={(e) => e.currentTarget.select()}
								className="w-full resize-y rounded-[10px] border border-border-strong bg-surface-subtle p-3 font-mono text-xs"
							/>
						</div>
					))}

				<DialogFooter>
					<Button
						variant="surface"
						onClick={() => onOpenChange(false)}
					>
						{load.status === "loading" ? "Mégse" : "Bezárás"}
					</Button>
					<Button
						disabled={load.status !== "done" || load.count === 0}
						onClick={() =>
							load.status === "done" &&
							void copy(load.text, load.count)
						}
					>
						<Copy aria-hidden="true" />
						Másolás
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
