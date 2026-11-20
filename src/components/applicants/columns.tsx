import { Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
	ageFromBirthYear,
	applicantInitials,
	EMPTY,
	formatDate,
	formatPhone,
	fullName,
	historyLabel,
	isOver16,
	latestApplication,
	parentLabel,
	programColorClass,
	STATUS_BADGE_CLASSES,
	STATUS_LABELS,
} from "@/lib/applicants/format";
import type { ColumnId } from "@/lib/applicants/column-settings";
import type { SortKey } from "@/lib/applicants/list-params";
import type { ApplicantListItem } from "@/lib/applicants/types";
import { cn } from "@/lib/utils";

export type { ColumnId };

/** Az oszlopok megjelenítése; a sorrend és a láthatóság: `column-settings.ts`. */
export type ColumnDef = {
	id: ColumnId;
	/** Fejléc a táblában. */
	label: string;
	/** Második fejlécsor (a rendezés nem erre vonatkozik), pl. a név alatti e-mail. */
	subLabel?: string;
	/** Extra osztály a fejléc tartalmán, pl. a cellák monogramjához igazításhoz. */
	headerClass?: string;
	/** Felirat az oszlopválasztóban. */
	pickerLabel: string;
	/** Nem rejthető el (a "Név / e-mail"). */
	locked?: boolean;
	sortKey?: SortKey;
	widthClass?: string;
	cell: (item: ApplicantListItem, now: Date) => ReactNode;
	/**
	 * Az érték a mobil kártyán (terv: 03.1 M), ha a táblázatcella ott nem
	 * megfelelő; hiányában a `cell`. Nem lehet benne interaktív elem, mert
	 * az egész kártya egy link.
	 */
	card?: (item: ApplicantListItem, now: Date) => ReactNode;
};

/** Az adatlap útvonala. */
export function applicantHref(id: string): string {
	return `/applicants/${encodeURIComponent(id)}`;
}

const dash = <span className="text-text-tertiary">{EMPTY}</span>;

export const COLUMNS: Record<ColumnId, ColumnDef> = {
	name: {
		id: "name",
		label: "Név",
		subLabel: "E-mail",
		headerClass: "pl-10",
		pickerLabel: "Név / e-mail",
		locked: true,
		sortKey: "name",
		cell: (item) => (
			<div className="flex min-w-0 items-center gap-2.5">
				<span
					aria-hidden="true"
					className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-sky-50 text-xs font-semibold"
				>
					{applicantInitials(item)}
				</span>
				<div className="min-w-0">
					<Link
						href={applicantHref(item.id)}
						className="block truncate font-medium underline-offset-2 hover:underline"
					>
						{fullName(item)}
					</Link>
					<div className="truncate text-xs text-text-tertiary">
						{item.email ?? EMPTY}
					</div>
				</div>
			</div>
		),
	},
	age: {
		id: "age",
		label: "Életkor",
		pickerLabel: "Életkor (16+ címke)",
		sortKey: "age",
		widthClass: "w-[90px]",
		// The 16+ badge is already in the card header.
		card: (item, now) => {
			const age = ageFromBirthYear(item.birthYear, now);
			return age === null ? dash : `${age} év`;
		},
		cell: (item, now) => {
			const age = ageFromBirthYear(item.birthYear, now);
			if (age === null) return dash;
			return (
				<div className="flex items-center gap-1.5">
					{age}
					{isOver16(age) && (
						<span className="rounded-full bg-info-bg px-2 text-xs leading-5 font-medium text-info-fg">
							16+
						</span>
					)}
				</div>
			);
		},
	},
	program: {
		id: "program",
		label: "Program",
		pickerLabel: "Program",
		widthClass: "w-[200px]",
		cell: (item) => {
			const { latest, more } = latestApplication(item.applications);
			if (!latest) return dash;
			return (
				<div className="flex min-w-0 items-center gap-2 text-xs">
					<span
						aria-hidden="true"
						className={cn(
							"size-2 shrink-0 rounded-full",
							programColorClass(latest.event.id),
						)}
					/>
					<span className="truncate">{latest.event.name}</span>
					{more > 0 && (
						<span
							className="shrink-0 font-mono text-text-tertiary"
							aria-label={`és még ${more} jelentkezés`}
						>
							+{more}
						</span>
					)}
				</div>
			);
		},
	},
	status: {
		id: "status",
		label: "Státusz",
		pickerLabel: "Státusz",
		widthClass: "w-[128px]",
		cell: (item) => {
			const { latest } = latestApplication(item.applications);
			if (!latest) return dash;
			return (
				<span
					className={cn(
						"inline-flex rounded-full px-2.5 text-xs leading-6 font-medium whitespace-nowrap text-text-primary",
						STATUS_BADGE_CLASSES[latest.status],
					)}
				>
					{STATUS_LABELS[latest.status]}
				</span>
			);
		},
	},
	location: {
		id: "location",
		label: "Település",
		subLabel: "Iskola",
		pickerLabel: "Település / iskola",
		card: (item) => {
			const parts = [item.hometown, item.schoolName].filter(Boolean);
			return parts.length > 0 ? parts.join(" · ") : dash;
		},
		sortKey: "location",
		widthClass: "w-[160px]",
		cell: (item) =>
			item.hometown || item.schoolName ? (
				<div className="min-w-0 text-xs">
					<div className="truncate">{item.hometown ?? EMPTY}</div>
					{item.schoolName && (
						<div className="truncate text-text-tertiary">
							{item.schoolName}
						</div>
					)}
				</div>
			) : (
				dash
			),
	},
	newsletter: {
		id: "newsletter",
		label: "Hírlevél",
		pickerLabel: "Hírlevél",
		card: (item) => (item.newsletter ? <span>Feliratkozott</span> : dash),
		widthClass: "w-[84px]",
		cell: (item) =>
			item.newsletter ? (
				<Check
					role="img"
					aria-label="Feliratkozott"
					className="size-4 text-success-fg"
				/>
			) : (
				dash
			),
	},
	history: {
		id: "history",
		label: "Előzmény",
		pickerLabel: "Előzmény (elvégzett programok)",
		sortKey: "history",
		// Plain text "N program", or "—" without attended programs.
		card: (item) => {
			const label = historyLabel(item.applications);
			return label === EMPTY ? dash : label;
		},
		widthClass: "w-[92px]",
		cell: (item) => {
			const label = historyLabel(item.applications);
			return label === EMPTY ? (
				dash
			) : (
				<span className="text-xs">{label}</span>
			);
		},
	},
	createdAt: {
		id: "createdAt",
		label: "Jelentkezett",
		pickerLabel: "Jelentkezés dátuma",
		sortKey: "createdAt",
		widthClass: "w-[124px]",
		cell: (item) => (
			<span className="font-mono text-xs text-text-secondary">
				{formatDate(item.createdAt)}
			</span>
		),
	},
	parent: {
		id: "parent",
		label: "Szülő",
		pickerLabel: "Szülő neve és e-mail",
		card: (item) => {
			const parent = parentLabel(item);
			const parts = [parent.name, parent.email].filter(Boolean);
			return parts.length > 0 ? (
				<span className="break-words">{parts.join(" · ")}</span>
			) : (
				dash
			);
		},
		widthClass: "w-[200px]",
		cell: (item) => {
			const parent = parentLabel(item);
			if (!parent.name && !parent.email) return dash;
			return (
				<div className="min-w-0 text-xs">
					<div className="truncate">{parent.name ?? EMPTY}</div>
					{parent.email && (
						<div className="truncate text-text-tertiary">
							{parent.email}
						</div>
					)}
				</div>
			);
		},
	},
	phone: {
		id: "phone",
		label: "Telefonszám",
		pickerLabel: "Telefonszám",
		widthClass: "w-[156px]",
		cell: (item) =>
			item.phoneNumber ? (
				<span className="font-mono text-xs whitespace-nowrap">
					{formatPhone(item.phoneNumber)}
				</span>
			) : (
				dash
			),
	},
};

/** Egy oszlop értéke a mobil kártyán: a `card` renderer, vagy a táblázatcella. */
export function cardValue(
	id: ColumnId,
	item: ApplicantListItem,
	now: Date,
): ReactNode {
	const column = COLUMNS[id];
	return (column.card ?? column.cell)(item, now);
}
