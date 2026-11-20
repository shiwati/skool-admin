"use client";

import { ChevronDown, CircleAlert, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { fieldControlClass } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError, apiFetch } from "@/lib/api/client";
import { defaultFeedbackMapping } from "@/lib/feedback/parse";
import {
	CUSTOM_KIND_LABELS,
	QUESTIONS,
	TIMESTAMP_KEY,
	type CustomQuestion,
	type FeedbackRoleKey,
	type FeedbackSheetMapping,
} from "@/lib/feedback/questions";
import {
	APPLICATION_FIELD_LABELS,
	APPLICATION_FIELDS,
	REQUIRED_FIELDS,
	defaultApplicationMapping,
	normalizeHeader,
	type ApplicationSheetMapping,
} from "@/lib/sheet-import/mapping";
import { cn } from "@/lib/utils";

type Props =
	| {
			kind: "application";
			value: ApplicationSheetMapping | null;
			onChange: (value: ApplicationSheetMapping | null) => void;
	  }
	| {
			kind: FeedbackRoleKey;
			value: FeedbackSheetMapping | null;
			onChange: (value: FeedbackSheetMapping | null) => void;
	  };

type Row = { key: string; label: string; required: boolean };

/** Egységes belső alak: mindkét sheet-típus oszlopai + (visszajelzésnél) egyéni kérdések. */
type Draft = { columns: Record<string, string>; custom: CustomQuestion[] };

function rowsFor(kind: Props["kind"]): Row[] {
	if (kind === "application") {
		const required = new Set<string>(REQUIRED_FIELDS);
		return APPLICATION_FIELDS.map((key) => ({
			key,
			label: APPLICATION_FIELD_LABELS[key],
			required: required.has(key),
		}));
	}
	return [
		{ key: TIMESTAMP_KEY, label: "Időbélyeg", required: true },
		...QUESTIONS[kind].map((q) => ({
			key: q.key,
			label: q.label,
			required: Boolean(q.required),
		})),
	];
}

function toDraft(props: Props): Draft | null {
	if (!props.value) return null;
	return props.kind === "application"
		? { columns: { ...props.value } as Record<string, string>, custom: [] }
		: { columns: { ...props.value.columns }, custom: props.value.custom };
}

function defaultDraft(kind: Props["kind"], headers: string[]): Draft {
	return kind === "application"
		? {
				columns: defaultApplicationMapping(headers) as Record<
					string,
					string
				>,
				custom: [],
			}
		: defaultFeedbackMapping(kind, headers);
}

const selectClass = cn(
	"h-9 w-full min-w-0 border bg-white text-sm",
	fieldControlClass,
);

/**
 * Lenyíló szerkesztő a sheet linkje alatt: mely DB-mező a sheet melyik
 * (pontos) fejlécéből töltődik. Amíg nincs mentett megfeleltetés, a
 * kulcsszavas alapértelmezés érvényes; a fejlécek betöltése után ez
 * kiválasztva jelenik meg, és bármelyik sor átállítható.
 */
export function SheetMappingEditor({
	url,
	urlValid,
	error,
	triggerId,
	...props
}: Props & {
	url: string;
	urlValid: boolean;
	error?: string;
	/** A lenyíló gomb id-ja (a hibaösszesítő ide fókuszál). */
	triggerId?: string;
}) {
	const id = useId();
	const [open, setOpen] = useState(false);
	const [loaded, setLoaded] = useState<{ url: string; headers: string[] }>();
	const [loading, setLoading] = useState(false);
	const [loadError, setLoadError] = useState<string>();

	const headers = loaded?.url === url ? loaded.headers : null;
	const rows = rowsFor(props.kind);
	const saved = toDraft(props);
	const isFeedback = props.kind !== "application";
	const draft = saved ?? (headers ? defaultDraft(props.kind, headers) : null);
	const present = new Set((headers ?? []).map(normalizeHeader));
	const inSheet = (header: string) => present.has(normalizeHeader(header));

	const emit = (next: Draft) => {
		if (props.kind === "application") {
			props.onChange(next.columns as ApplicationSheetMapping);
		} else {
			props.onChange({ columns: next.columns, custom: next.custom });
		}
	};
	const setColumn = (key: string, header: string) => {
		if (!draft) return;
		const columns = { ...draft.columns };
		if (header) columns[key] = header;
		else delete columns[key];
		emit({ ...draft, columns });
	};
	const setCustom = (custom: CustomQuestion[]) => {
		if (draft) emit({ ...draft, custom });
	};

	const loadHeaders = async () => {
		setLoading(true);
		setLoadError(undefined);
		try {
			const result = await apiFetch<{ headers: string[] }>(
				"/api/sheets/headers",
				{
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ url }),
				},
			);
			setLoaded({ url, headers: result.headers });
		} catch (e) {
			if (e instanceof ApiError && e.status === 401) return;
			const message = (e instanceof ApiError &&
				(e.body as { error?: unknown } | undefined)?.error) as unknown;
			setLoadError(
				typeof message === "string" && e instanceof ApiError
					? message
					: "A fejlécek betöltése nem sikerült.",
			);
		} finally {
			setLoading(false);
		}
	};

	const options = (current: string | undefined) => {
		const list = headers ?? [];
		const missing = current && !inSheet(current) ? [current] : [];
		return (
			<>
				<option value="">— nincs hozzárendelve —</option>
				{missing.map((h) => (
					<option key={`missing-${h}`} value={h}>
						{h} (nincs a sheetben)
					</option>
				))}
				{list.map((h) => (
					<option key={h} value={h}>
						{h}
					</option>
				))}
			</>
		);
	};

	return (
		<div className="rounded-lg border border-border-default md:col-span-2">
			<button
				id={triggerId}
				type="button"
				aria-expanded={open}
				aria-controls={`${id}-panel`}
				onClick={() => setOpen((o) => !o)}
				className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium hover:bg-surface-subtle"
			>
				<ChevronDown
					aria-hidden="true"
					className={cn(
						"size-4 transition-transform",
						open && "rotate-180",
					)}
				/>
				<span className="flex-1">Mező-megfeleltetés</span>
				<span
					className={cn(
						"rounded-full px-2 py-0.5 font-mono text-[11px]",
						saved
							? "bg-sky-50 text-text-primary"
							: "bg-surface-subtle text-text-secondary",
					)}
				>
					{saved ? "Egyéni" : "Alapértelmezett"}
				</span>
				{error && (
					<CircleAlert
						aria-label="Hibás megfeleltetés"
						className="size-4 text-error-fg"
					/>
				)}
			</button>

			{open && (
				<div
					id={`${id}-panel`}
					className="flex flex-col gap-3 border-t border-border-default p-3.5"
				>
					<p className="text-xs text-text-tertiary">
						Melyik adatbázis-mező a sheet melyik oszlopából (pontos
						fejléc) töltődjön. Alapértelmezésben a rendszer a
						fejlécek kulcsszavaiból ismeri fel az oszlopokat; a
						fejlécek betöltése után ez látszik kiválasztva, és
						bármelyik sor átállítható. Ha egy kötelező mező fejléce
						hiányzik a sheetből, a szinkron hibát jelez.
					</p>
					<div className="flex flex-wrap gap-2">
						<Button
							type="button"
							variant="surface"
							size="sm"
							disabled={!urlValid || loading}
							onClick={loadHeaders}
						>
							{loading
								? "Betöltés…"
								: headers
									? "Fejlécek újratöltése"
									: "Fejlécek betöltése a sheetből"}
						</Button>
						{saved && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => props.onChange(null)}
							>
								Visszaállítás alapértelmezésre
							</Button>
						)}
					</div>
					{!urlValid && (
						<p className="text-xs text-text-tertiary">
							Előbb adj meg egy érvényes sheet linket.
						</p>
					)}
					{loadError && (
						<p role="alert" className="text-xs text-error-fg">
							{loadError}
						</p>
					)}

					{!draft ? (
						<p className="text-sm text-text-secondary">
							Alapértelmezett, kulcsszavas felismerés. A
							módosításhoz töltsd be a fejléceket.
						</p>
					) : (
						<table className="w-full text-sm">
							<thead className="sr-only">
								<tr>
									<th>Mező</th>
									<th>Sheet fejléc</th>
								</tr>
							</thead>
							<tbody>
								{rows.map((row) => {
									const current = draft.columns[row.key];
									const missing =
										headers && current && !inSheet(current);
									const selectId = `${id}-${row.key}`;
									return (
										<tr
											key={row.key}
											className="border-b border-border-default last:border-0"
										>
											<th
												scope="row"
												className="w-2/5 py-1.5 pr-3 text-left align-middle font-normal"
											>
												<label htmlFor={selectId}>
													{row.label}
													{row.required && (
														<span
															aria-hidden="true"
															className="text-error-fg"
														>
															{" "}
															*
														</span>
													)}
												</label>
											</th>
											<td className="py-1.5">
												{headers ? (
													<select
														id={selectId}
														value={current ?? ""}
														onChange={(e) =>
															setColumn(
																row.key,
																e.target.value,
															)
														}
														aria-invalid={
															(missing &&
																row.required) ||
															undefined
														}
														className={selectClass}
													>
														{options(current)}
													</select>
												) : (
													<span
														id={selectId}
														className="text-text-secondary"
													>
														{current ?? "—"}
													</span>
												)}
												{missing && (
													<p
														className={cn(
															"mt-1 text-xs",
															row.required
																? "text-error-fg"
																: "text-text-tertiary",
														)}
													>
														Ez a fejléc nincs a
														sheetben
														{row.required
															? " – a szinkron hibát fog jelezni."
															: " – a mező üres marad."}
													</p>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					)}

					{isFeedback && draft && (
						<CustomQuestions
							idPrefix={id}
							questions={draft.custom}
							headers={headers}
							inSheet={inSheet}
							options={options}
							onChange={setCustom}
						/>
					)}

					{error && (
						<p
							role="alert"
							className="flex items-center gap-1.5 text-xs text-error-fg"
						>
							<CircleAlert
								aria-hidden="true"
								className="size-3.5 shrink-0"
							/>
							{error}
						</p>
					)}
				</div>
			)}
		</div>
	);
}

function CustomQuestions({
	idPrefix,
	questions,
	headers,
	inSheet,
	options,
	onChange,
}: {
	idPrefix: string;
	questions: CustomQuestion[];
	headers: string[] | null;
	inSheet: (header: string) => boolean;
	options: (current: string | undefined) => React.ReactNode;
	onChange: (questions: CustomQuestion[]) => void;
}) {
	const update = (index: number, patch: Partial<CustomQuestion>) =>
		onChange(
			questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
		);

	return (
		<fieldset className="flex flex-col gap-2 border-t border-border-default pt-3">
			<legend className="sr-only">Egyéni kérdések</legend>
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium" aria-hidden="true">
					Egyéni kérdések
				</span>
				<Button
					type="button"
					variant="surface"
					size="sm"
					disabled={!headers}
					onClick={() =>
						onChange([
							...questions,
							{ label: "", kind: "text", header: "" },
						])
					}
				>
					<Plus aria-hidden="true" className="size-3.5" />
					Új kérdés
				</Button>
			</div>
			<p className="text-xs text-text-tertiary">
				Az űrlapon újonnan felvett kérdések. A válaszok a visszajelzés
				részleteinél jelennek meg (a statisztikákba nem számítanak
				bele).
				{!headers && " Hozzáadáshoz töltsd be a fejléceket."}
			</p>
			{questions.map((q, index) => {
				const base = `${idPrefix}-custom-${index}`;
				return (
					<div
						key={index}
						className="grid gap-2 rounded-md bg-surface-subtle p-2 md:grid-cols-[1fr_9rem_1fr_auto]"
					>
						<Input
							aria-label={`${index + 1}. egyéni kérdés neve`}
							id={`${base}-label`}
							value={q.label}
							placeholder="Kérdés neve"
							onChange={(e) =>
								update(index, { label: e.target.value })
							}
							className={cn("h-9", fieldControlClass)}
						/>
						<select
							aria-label={`${index + 1}. egyéni kérdés típusa`}
							value={q.kind}
							onChange={(e) =>
								update(index, {
									kind: e.target
										.value as CustomQuestion["kind"],
								})
							}
							className={selectClass}
						>
							{Object.entries(CUSTOM_KIND_LABELS).map(
								([value, label]) => (
									<option key={value} value={value}>
										{label}
									</option>
								),
							)}
						</select>
						{headers ? (
							<select
								aria-label={`${index + 1}. egyéni kérdés oszlopa`}
								value={q.header}
								onChange={(e) =>
									update(index, { header: e.target.value })
								}
								aria-invalid={
									(q.header && !inSheet(q.header)) ||
									undefined
								}
								className={selectClass}
							>
								{options(q.header || undefined)}
							</select>
						) : (
							<span className="self-center text-sm text-text-secondary">
								{q.header || "—"}
							</span>
						)}
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label={`${index + 1}. egyéni kérdés törlése`}
							onClick={() =>
								onChange(
									questions.filter((_, i) => i !== index),
								)
							}
						>
							<Trash2 aria-hidden="true" className="size-4" />
						</Button>
					</div>
				);
			})}
		</fieldset>
	);
}
