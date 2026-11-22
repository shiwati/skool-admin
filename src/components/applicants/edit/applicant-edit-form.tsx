"use client";

import {
	ALUMNI_LABEL,
	ALUMNI_MIN_ATTENDED,
	TAG_BADGE_CLASSES,
} from "@/lib/applicants/format";
import { Pill } from "@/components/applicants/detail/detail-card";
import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Controller } from "react-hook-form";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/admin-shell/breadcrumb";
import { PageHeader } from "@/components/admin-shell/page-header";
import { PageShell } from "@/components/admin-shell/page-shell";
import {
	FormErrorSummary,
	type ErrorSummaryItem,
} from "@/components/form/form-error-summary";
import { FormField, fieldControlClass } from "@/components/form/form-field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useZodForm } from "@/hooks/use-zod-form";
import { ApiError, apiFetch, jsonInit } from "@/lib/api/client";
import {
	APPLICANT_FIELD_LABELS,
	applicantEditSchema,
	type ApplicantEditField,
	type ApplicantEditValues,
} from "@/lib/applicants/edit-schema";
import { cn } from "@/lib/utils";

const inputId = (name: ApplicantEditField) => `applicant-${name}`;
const controlClass = cn("h-10", fieldControlClass);

export const CONFLICT_MESSAGE =
	"Az adatlapot közben valaki módosította. Töltsd újra az oldalt, és vezesd át a módosításaidat.";

function applyServerErrors(
	body: unknown,
	setError: (name: ApplicantEditField, error: { message: string }) => void,
): boolean {
	const fieldErrors = (
		body as { details?: { fieldErrors?: Record<string, string[]> } } | null
	)?.details?.fieldErrors;
	let applied = false;
	for (const [key, messages] of Object.entries(fieldErrors ?? {})) {
		if (!(key in APPLICANT_FIELD_LABELS) || !messages?.[0]) continue;
		setError(key as ApplicantEditField, { message: messages[0] });
		applied = true;
	}
	return applied;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<Card className="p-4 md:p-6">
			<section aria-label={title} className="flex flex-col gap-4">
				<h2 className="text-base font-bold">{title}</h2>
				{children}
			</section>
		</Card>
	);
}

export function ApplicantEditForm({
	id,
	name,
	initialValues,
	updatedAt,
}: {
	id: string;
	/** „Vezetéknév Keresztnév”, a betöltéskori állapot szerint. */
	name: string;
	initialValues: ApplicantEditValues;
	/** A betöltéskori `updatedAt` (ISO), az ütközés-ellenőrzéshez. */
	updatedAt: string;
}) {
	const router = useRouter();
	const [conflict, setConflict] = useState(false);
	const detailHref = `/applicants/${encodeURIComponent(id)}`;
	const {
		register,
		control,
		handleSubmit,
		setError,
		reset,
		formState: { errors, dirtyFields, isSubmitting, submitCount },
	} = useZodForm<ApplicantEditValues, ApplicantEditValues>(
		applicantEditSchema,
		{ defaultValues: initialValues },
	);

	const changed = Object.values(dirtyFields).filter(Boolean).length;
	const dirty = changed > 0;

	// Ask before closing or reloading the tab with unsaved changes.
	useEffect(() => {
		if (!dirty || isSubmitting) return;
		const onBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
		};
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	}, [dirty, isSubmitting]);

	const message = (field: ApplicantEditField) =>
		errors[field]?.message as string | undefined;
	const summary: ErrorSummaryItem[] =
		submitCount > 0
			? (Object.keys(APPLICANT_FIELD_LABELS) as ApplicantEditField[])
					.filter((field) => errors[field])
					.map((field) => ({
						name: field,
						label: APPLICANT_FIELD_LABELS[field],
					}))
			: [];

	const onSubmit = handleSubmit(async (values) => {
		setConflict(false);
		try {
			await apiFetch<{ updatedAt: string }>(
				`/api/applicants/${encodeURIComponent(id)}/edit`,
				jsonInit("POST", {
					...values,
					expectedUpdatedAt: updatedAt,
				}),
			);
			// Clean form: no "unsaved changes" prompt while navigating away.
			reset(values);
			toast.success("Az adatlap mentve.");
			router.push(detailHref);
			router.refresh();
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) return;
			if (error instanceof ApiError && error.status === 409) {
				setConflict(true);
				return;
			}
			if (
				error instanceof ApiError &&
				error.status === 400 &&
				applyServerErrors(error.body, setError)
			) {
				return;
			}
			toast.error("A mentés nem sikerült. Próbáld újra.");
		}
	});

	const text = (
		field: ApplicantEditField,
		options: {
			required?: boolean;
			hint?: string;
			type?: string;
			inputMode?: "numeric" | "tel" | "email";
			autoComplete?: string;
		} = {},
	) => (
		<FormField
			id={inputId(field)}
			label={APPLICANT_FIELD_LABELS[field]}
			required={options.required}
			error={message(field)}
			hint={options.hint}
		>
			{(control) => (
				<Input
					{...control}
					{...register(field)}
					type={options.type ?? "text"}
					inputMode={options.inputMode}
					autoComplete={options.autoComplete ?? "off"}
					className={controlClass}
				/>
			)}
		</FormField>
	);

	return (
		<PageShell>
			<Breadcrumb
				items={[
					{ label: "Jelentkezők", href: "/applicants" },
					{ label: name, href: detailHref },
					{ label: "Szerkesztés" },
				]}
			/>
			<PageHeader
				title="Adatlap szerkesztése"
				description="A mentett módosítások a változástörténetbe kerülnek, a neveddel és az időponttal."
				actions={
					<Button asChild variant="surface">
						<Link href={detailHref}>Mégse</Link>
					</Button>
				}
			/>

			{conflict && (
				<div
					role="alert"
					className="flex flex-wrap items-center gap-3 rounded-[14px] bg-warning-bg px-4 py-3 text-sm text-warning-fg"
				>
					<TriangleAlert
						aria-hidden="true"
						className="size-4 shrink-0"
					/>
					<span className="flex-1">{CONFLICT_MESSAGE}</span>
					<Button
						type="button"
						variant="surface"
						size="sm"
						onClick={() => window.location.reload()}
					>
						<RotateCcw aria-hidden="true" />
						Újratöltés
					</Button>
				</div>
			)}

			<FormErrorSummary
				title={`${summary.length} mező javításra szorul`}
				items={summary}
				onSelect={(field) =>
					document
						.getElementById(inputId(field as ApplicantEditField))
						?.focus()
				}
			/>

			<form
				noValidate
				onSubmit={onSubmit}
				aria-label="Jelentkező adatlap szerkesztése"
				className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
			>
				<div className="flex min-w-0 flex-col gap-5">
					<Section title="Személyes adatok">
						<div className="grid gap-4 md:grid-cols-2">
							{text("lastName", {
								required: true,
								autoComplete: "family-name",
							})}
							{text("firstName", {
								required: true,
								autoComplete: "given-name",
							})}
							{text("birthYear", {
								inputMode: "numeric",
								hint: "Négyjegyű évszám",
							})}
							{text("email", {
								required: true,
								type: "email",
								inputMode: "email",
							})}
							{text("phoneNumber", {
								type: "tel",
								inputMode: "tel",
								hint: "Nemzetközi formátumban",
							})}
							{text("schoolName")}
							{text("hometown")}
						</div>
					</Section>
					<Section title="Szülő / gondviselő">
						<div className="grid gap-4 md:grid-cols-2">
							{text("parentLastName")}
							{text("parentFirstName")}
							{text("parentMothersName")}
							{text("parentAddress")}
							{text("parentEmail", {
								type: "email",
								inputMode: "email",
							})}
							{text("parentPhone", {
								type: "tel",
								inputMode: "tel",
							})}
						</div>
						<Controller
							control={control}
							name="newsletter"
							render={({ field }) => (
								<label className="flex items-center gap-2 text-sm">
									<Checkbox
										id={inputId("newsletter")}
										checked={field.value}
										onCheckedChange={(checked) =>
											field.onChange(checked === true)
										}
										onBlur={field.onBlur}
									/>
									Feliratkozott a hírlevélre
								</label>
							)}
						/>
					</Section>
				</div>

				<aside
					className="flex min-w-0 flex-col gap-5"
					aria-label="Tudnivalók"
				>
					<Card className="flex flex-col gap-2 p-6">
						<h2 className="text-base font-bold">Mit naplózunk?</h2>
						<p className="text-sm text-text-secondary">
							Minden mentett mezőnél: ki módosított (Google-fiók),
							mikor, és a régi → új érték. A naplóbejegyzések nem
							szerkeszthetők és nem törölhetők.
						</p>
					</Card>
					<Card className="flex flex-col gap-3 p-6">
						<h2 className="text-base font-bold">
							Automatikus mezők
						</h2>
						<p className="flex items-center gap-2 text-sm text-text-secondary">
							<Pill className={TAG_BADGE_CLASSES.over16}>
								16+
							</Pill>
							a születési évből számolva
						</p>
						<p className="flex items-center gap-2 text-sm text-text-secondary">
							<Pill className={TAG_BADGE_CLASSES.alumni}>
								{ALUMNI_LABEL}
							</Pill>
							legalább {ALUMNI_MIN_ATTENDED} elvégzett program
							esetén
						</p>
					</Card>
				</aside>

				{dirty && (
					<div
						role="region"
						aria-label="Mentés"
						className="fixed right-0 bottom-[var(--shell-bottom)] left-0 z-40 flex items-center gap-3 rounded-none bg-ink py-2 pr-2 pl-5 text-white shadow-overlay md:right-6 md:bottom-6 md:left-[calc(var(--shell-left)+1.5rem)] md:rounded-full xl:right-8 xl:left-[calc(var(--shell-left)+2rem)]"
					>
						<span
							aria-hidden="true"
							className="size-2 rounded-full bg-peach"
						/>
						<span
							className="flex-1 text-sm font-medium"
							aria-live="polite"
						>
							{changed} nem mentett módosítás
						</span>
						<Button
							type="button"
							variant="ghost"
							className="rounded-full text-white hover:bg-white/10 hover:text-white"
							disabled={isSubmitting}
							onClick={() => {
								setConflict(false);
								reset(initialValues);
							}}
						>
							Elvetés
						</Button>
						<Button
							type="submit"
							className="rounded-full bg-white text-ink hover:bg-white/90"
							disabled={isSubmitting}
							aria-busy={isSubmitting || undefined}
						>
							Mentés
						</Button>
					</div>
				)}
			</form>
		</PageShell>
	);
}
