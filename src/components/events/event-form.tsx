"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
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
import { TagCombobox } from "@/components/form/tag-combobox";
import { TagInput } from "@/components/form/tag-input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useZodForm } from "@/hooks/use-zod-form";
import { ApiError, apiFetch } from "@/lib/api/client";
import {
	eventFormSchema,
	toCreateEventInput,
	toEventFormValues,
	toUpdateEventInput,
	type EventFormSource,
	type EventFormValues,
} from "@/lib/events/schema";
import { parseSheetUrl } from "@/lib/google/sheet-url";
import { cn } from "@/lib/utils";
import { SheetMappingEditor } from "./sheet-mapping-editor";

type FieldName = keyof EventFormValues;

const FIELD_LABELS: Record<FieldName, string> = {
	name: "Program neve",
	tags: "Címkék",
	description: "Rövid leírás",
	from: "Kezdés",
	to: "Befejezés",
	companyName: "Helyszín / partnercég",
	location: "Cím",
	capacity: "Maximális létszám",
	ageFrom: "Korosztály – tól",
	ageTo: "Korosztály – ig",
	applicationSheetUrl: "Jelentkezők sheetje",
	participantFeedbackSheetUrl: "Résztvevői visszajelzések sheetje",
	mentorFeedbackSheetUrl: "Mentori visszajelzések sheetje",
	applicationSheetMapping: "Jelentkezők sheetjének mező-megfeleltetése",
	participantFeedbackSheetMapping:
		"Résztvevői visszajelzések mező-megfeleltetése",
	mentorFeedbackSheetMapping: "Mentori visszajelzések mező-megfeleltetése",
	instructor: "Oktató",
	mentors: "Mentorok",
};

const SECTIONS: { id: string; title: string; fields: FieldName[] }[] = [
	{
		id: "alapadatok",
		title: "Alapadatok",
		fields: ["name", "tags", "description"],
	},
	{
		id: "idopont",
		title: "Időpont & helyszín",
		fields: ["from", "to", "companyName", "location"],
	},
	{
		id: "kapacitas",
		title: "Kapacitás",
		fields: [
			"capacity",
			"ageFrom",
			"ageTo",
			"applicationSheetUrl",
			"applicationSheetMapping",
		],
	},
	{
		id: "oktatok",
		title: "Oktatók & mentorok",
		fields: ["instructor", "mentors"],
	},
	{
		id: "zaro-riport",
		title: "Záró riport mezői",
		fields: [
			"participantFeedbackSheetUrl",
			"participantFeedbackSheetMapping",
			"mentorFeedbackSheetUrl",
			"mentorFeedbackSheetMapping",
		],
	},
];

// A szerver `ageRange` hibáját a korosztály záró mezőjén jelenítjük meg.
const SERVER_FIELD_ALIASES: Record<string, FieldName> = { ageRange: "ageTo" };

const inputId = (name: FieldName) => `event-${name}`;

function applyServerErrors(
	body: unknown,
	setError: (name: FieldName, error: { message: string }) => void,
): boolean {
	const fieldErrors = (
		body as { details?: { fieldErrors?: Record<string, string[]> } } | null
	)?.details?.fieldErrors;
	let applied = false;
	for (const [key, messages] of Object.entries(fieldErrors ?? {})) {
		const name = SERVER_FIELD_ALIASES[key] ?? (key as FieldName);
		if (!(name in FIELD_LABELS) || !messages?.[0]) continue;
		setError(name, { message: messages[0] });
		applied = true;
	}
	return applied;
}

function FormSection({
	id,
	index,
	title,
	children,
}: {
	id: string;
	index: number;
	title: string;
	children: ReactNode;
}) {
	return (
		<Card className="scroll-mt-6 p-4 md:p-6">
			<section aria-labelledby={`${id}-title`} id={id}>
				<h2 id={`${id}-title`} className="mb-4 text-base font-bold">
					{index} · {title}
				</h2>
				<div className="grid gap-4 md:grid-cols-2">{children}</div>
			</section>
		</Card>
	);
}

const controlClass = cn("h-10", fieldControlClass);

const EMPTY_VALUES: EventFormValues = {
	name: "",
	tags: [],
	description: "",
	from: "",
	to: "",
	companyName: "",
	location: "",
	capacity: "",
	ageFrom: "",
	ageTo: "",
	applicationSheetUrl: "",
	participantFeedbackSheetUrl: "",
	mentorFeedbackSheetUrl: "",
	applicationSheetMapping: null,
	participantFeedbackSheetMapping: null,
	mentorFeedbackSheetMapping: null,
	instructor: "",
	mentors: [],
};

type EventFormProps =
	{ mode: "create" } | { mode: "edit"; event: EventFormSource };

export function EventForm(props: EventFormProps) {
	const router = useRouter();
	const [saved, setSaved] = useState(false);
	const editing = props.mode === "edit";
	const {
		register,
		control,
		handleSubmit,
		setError,
		watch,
		formState: { errors, isSubmitting, submitCount },
	} = useZodForm<EventFormValues, EventFormValues>(eventFormSchema, {
		defaultValues:
			props.mode === "edit"
				? toEventFormValues(props.event)
				: EMPTY_VALUES,
	});

	const message = (name: FieldName): string | undefined => {
		const error = errors[name];
		if (error?.message) return error.message as string;
		// Array fields (tags): the error sits on the offending item.
		if (Array.isArray(error)) {
			return error.find((item) => item?.message)?.message as
				string | undefined;
		}
		return undefined;
	};
	const invalid = (Object.keys(FIELD_LABELS) as FieldName[]).filter(
		(name) => errors[name],
	);
	const summary: ErrorSummaryItem[] =
		submitCount > 0
			? invalid.map((name) => ({ name, label: FIELD_LABELS[name] }))
			: [];

	const sheetUrl = (name: FieldName) => {
		const url = String(watch(name) ?? "");
		return { url, urlValid: parseSheetUrl(url) !== null };
	};

	const focusField = (name: string) =>
		document.getElementById(inputId(name as FieldName))?.focus();

	const onSubmit = handleSubmit(async (values) => {
		try {
			const event = await apiFetch<{ id: string }>(
				props.mode === "edit"
					? `/api/events/${props.event.id}`
					: "/api/events",
				{
					method: props.mode === "edit" ? "PATCH" : "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(
						props.mode === "edit"
							? toUpdateEventInput(values)
							: toCreateEventInput(values),
					),
				},
			);
			setSaved(true);
			toast.success("A program mentve.");
			router.push(`/events/${event.id}`);
		} catch (error) {
			if (error instanceof ApiError && error.status === 401) return;
			if (error instanceof ApiError && error.status === 404) {
				toast.error("A program már nem létezik.");
				return;
			}
			if (
				error instanceof ApiError &&
				error.status === 400 &&
				applyServerErrors(error.body, setError)
			) {
				return;
			}
			toast.error("A program mentése nem sikerült. Próbáld újra.");
		}
	});

	return (
		<PageShell>
			<Breadcrumb
				items={
					props.mode === "edit"
						? [
								{ label: "Programok", href: "/events" },
								{ label: props.event.name },
								{ label: "Szerkesztés" },
							]
						: [
								{ label: "Programok", href: "/events" },
								{ label: "Új program" },
							]
				}
			/>
			<PageHeader
				title={
					editing ? "Program szerkesztése" : "Új program felvétele"
				}
				description="A program adatlapja tárolja azt, hogy mi kerüljön a záró riportba."
			/>
			<FormErrorSummary
				title={`A program nem menthető – ${summary.length} hiba`}
				items={summary}
				onSelect={focusField}
			/>
			<form
				noValidate
				onSubmit={onSubmit}
				aria-label={editing ? "Program szerkesztése" : "Új program"}
			>
				<div className="grid items-start gap-6 xl:grid-cols-[200px_minmax(0,1fr)]">
					<nav
						aria-label="Szakaszok"
						className="sticky top-6 hidden flex-col gap-0.5 xl:flex"
					>
						{SECTIONS.map((section, index) => {
							const count = section.fields.filter(
								(name) => errors[name],
							).length;
							return (
								<a
									key={section.id}
									href={`#${section.id}`}
									className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-sky-50 hover:text-text-primary"
								>
									<span>
										{index + 1} · {section.title}
									</span>
									{submitCount > 0 && count > 0 && (
										<span className="grid size-5 place-items-center rounded-full bg-error-bg text-[11px] font-semibold text-error-fg">
											<span className="sr-only">
												Hibák:{" "}
											</span>
											{count}
										</span>
									)}
								</a>
							);
						})}
					</nav>

					<div className="flex min-w-0 flex-col gap-5">
						<FormSection
							id="alapadatok"
							index={1}
							title="Alapadatok"
						>
							<FormField
								id={inputId("name")}
								label="Program neve"
								required
								error={message("name")}
								className="md:col-span-2"
							>
								{(field) => (
									<Input
										{...field}
										{...register("name")}
										autoComplete="off"
										placeholder="pl. Python alapok – tavasz"
										className={controlClass}
									/>
								)}
							</FormField>
							<FormField
								id={inputId("tags")}
								label="Címkék"
								error={message("tags")}
								hint="Válassz a használt címkék közül, vagy írj be újat."
								className="md:col-span-2"
							>
								{(field) => (
									<Controller
										control={control}
										name="tags"
										render={({
											field: { value, onChange },
										}) => (
											<TagCombobox
												{...field}
												value={value}
												onChange={onChange}
											/>
										)}
									/>
								)}
							</FormField>
							<FormField
								id={inputId("description")}
								label="Rövid leírás"
								error={message("description")}
								className="md:col-span-2"
							>
								{(field) => (
									<Textarea
										{...field}
										{...register("description")}
										rows={3}
										className={cn(
											"min-h-24",
											fieldControlClass,
										)}
									/>
								)}
							</FormField>
						</FormSection>

						<FormSection
							id="idopont"
							index={2}
							title="Időpont & helyszín"
						>
							<FormField
								id={inputId("from")}
								label="Kezdés"
								required
								error={message("from")}
							>
								{(field) => (
									<Input
										{...field}
										{...register("from")}
										type="datetime-local"
										className={controlClass}
									/>
								)}
							</FormField>
							<FormField
								id={inputId("to")}
								label="Befejezés"
								required
								error={message("to")}
							>
								{(field) => (
									<Input
										{...field}
										{...register("to")}
										type="datetime-local"
										min={watch("from") || undefined}
										className={controlClass}
									/>
								)}
							</FormField>
							<FormField
								id={inputId("companyName")}
								label="Helyszín / partnercég"
								error={message("companyName")}
							>
								{(field) => (
									<Input
										{...field}
										{...register("companyName")}
										autoComplete="off"
										className={controlClass}
									/>
								)}
							</FormField>
							<FormField
								id={inputId("location")}
								label="Cím"
								error={message("location")}
							>
								{(field) => (
									<Input
										{...field}
										{...register("location")}
										autoComplete="off"
										placeholder="pl. 1117 Budapest, Infopark sétány 1."
										className={controlClass}
									/>
								)}
							</FormField>
						</FormSection>

						<FormSection id="kapacitas" index={3} title="Kapacitás">
							<FormField
								id={inputId("capacity")}
								label="Max. tanulói létszám"
								required
								error={message("capacity")}
								className="md:col-span-2"
							>
								{(field) => (
									<Input
										{...field}
										{...register("capacity")}
										type="number"
										inputMode="numeric"
										min={1}
										className={controlClass}
									/>
								)}
							</FormField>
							<FormField
								id={inputId("ageFrom")}
								label="Korosztály – tól"
								error={message("ageFrom")}
							>
								{(field) => (
									<Input
										{...field}
										{...register("ageFrom")}
										type="number"
										inputMode="numeric"
										min={0}
										placeholder="év"
										className={controlClass}
									/>
								)}
							</FormField>
							<FormField
								id={inputId("ageTo")}
								label="Korosztály – ig"
								error={message("ageTo")}
							>
								{(field) => (
									<Input
										{...field}
										{...register("ageTo")}
										type="number"
										inputMode="numeric"
										min={0}
										placeholder="év"
										className={controlClass}
									/>
								)}
							</FormField>
							<FormField
								id={inputId("applicationSheetUrl")}
								label="Jelentkezők sheetje"
								hint="A jelentkezők Google Sheetjének linkje; a másolt link gid része jelöli a lapot."
								error={message("applicationSheetUrl")}
								className="md:col-span-2"
							>
								{(field) => (
									<Input
										{...field}
										{...register("applicationSheetUrl")}
										type="url"
										autoComplete="off"
										placeholder="https://docs.google.com/spreadsheets/d/…"
										className={controlClass}
									/>
								)}
							</FormField>
							<Controller
								control={control}
								name="applicationSheetMapping"
								render={({ field: { value, onChange } }) => (
									<SheetMappingEditor
										kind="application"
										value={value}
										onChange={onChange}
										error={message(
											"applicationSheetMapping",
										)}
										triggerId={inputId(
											"applicationSheetMapping",
										)}
										{...sheetUrl("applicationSheetUrl")}
									/>
								)}
							/>
						</FormSection>

						<FormSection
							id="oktatok"
							index={4}
							title="Oktatók & mentorok"
						>
							<FormField
								id={inputId("instructor")}
								label="Oktató"
								error={message("instructor")}
								className="md:col-span-2"
							>
								{(field) => (
									<Input
										{...field}
										{...register("instructor")}
										autoComplete="off"
										className={controlClass}
									/>
								)}
							</FormField>
							<FormField
								id={inputId("mentors")}
								label="Mentorok"
								hint="Enterrel vagy vesszővel adhatsz hozzá nevet."
								error={message("mentors")}
								className="md:col-span-2"
							>
								{(field) => (
									<Controller
										control={control}
										name="mentors"
										render={({
											field: { value, onChange },
										}) => (
											<TagInput
												{...field}
												value={value}
												onChange={onChange}
												chipClassName="bg-pink-soft ring-1 ring-pink ring-inset"
												placeholder="Név hozzáadása…"
												removeLabel={(name) =>
													`${name} eltávolítása`
												}
											/>
										)}
									/>
								)}
							</FormField>
						</FormSection>

						<FormSection
							id="zaro-riport"
							index={5}
							title="Záró riport mezői"
						>
							<FormField
								id={inputId("participantFeedbackSheetUrl")}
								label="Résztvevői visszajelzések sheetje"
								hint="A résztvevői visszajelző űrlap válasz-sheetje; a másolt link gid része jelöli a lapot."
								error={message("participantFeedbackSheetUrl")}
								className="md:col-span-2"
							>
								{(field) => (
									<Input
										{...field}
										{...register(
											"participantFeedbackSheetUrl",
										)}
										type="url"
										autoComplete="off"
										placeholder="https://docs.google.com/spreadsheets/d/…"
										className={controlClass}
									/>
								)}
							</FormField>
							<Controller
								control={control}
								name="participantFeedbackSheetMapping"
								render={({ field: { value, onChange } }) => (
									<SheetMappingEditor
										kind="PARTICIPANT"
										value={value}
										onChange={onChange}
										error={message(
											"participantFeedbackSheetMapping",
										)}
										triggerId={inputId(
											"participantFeedbackSheetMapping",
										)}
										{...sheetUrl(
											"participantFeedbackSheetUrl",
										)}
									/>
								)}
							/>
							<FormField
								id={inputId("mentorFeedbackSheetUrl")}
								label="Mentori visszajelzések sheetje"
								hint="A mentori visszajelző űrlap válasz-sheetje; a másolt link gid része jelöli a lapot."
								error={message("mentorFeedbackSheetUrl")}
								className="md:col-span-2"
							>
								{(field) => (
									<Input
										{...field}
										{...register("mentorFeedbackSheetUrl")}
										type="url"
										autoComplete="off"
										placeholder="https://docs.google.com/spreadsheets/d/…"
										className={controlClass}
									/>
								)}
							</FormField>
							<Controller
								control={control}
								name="mentorFeedbackSheetMapping"
								render={({ field: { value, onChange } }) => (
									<SheetMappingEditor
										kind="MENTOR"
										value={value}
										onChange={onChange}
										error={message(
											"mentorFeedbackSheetMapping",
										)}
										triggerId={inputId(
											"mentorFeedbackSheetMapping",
										)}
										{...sheetUrl("mentorFeedbackSheetUrl")}
									/>
								)}
							/>
						</FormSection>

						<Card className="mt-5 flex items-center justify-end gap-2 p-4">
							<Button
								asChild
								variant="surface"
								className="h-11 flex-1 px-6 font-mono text-[13px] md:flex-none"
							>
								<Link href="/events">Mégse</Link>
							</Button>
							<Button
								type="submit"
								disabled={isSubmitting || saved}
								className="h-11 flex-1 px-6 font-mono text-[13px] md:flex-none"
							>
								{editing
									? "Változtatások mentése"
									: "Program mentése"}
							</Button>
						</Card>
					</div>
				</div>
			</form>
		</PageShell>
	);
}
