import {
	historyFieldLabel,
	historyValue,
} from "@/lib/applicants/detail-labels";
import { EMPTY } from "@/lib/applicants/format";
import {
	eventHistoryFieldLabel,
	eventHistoryValue,
} from "@/lib/events/history-labels";

/** Jelentkező vagy program változása: a feliratok ettől függenek. */
export type HistoryKind = "applicant" | "event";

type Entry = {
	actor: string | null;
	field: string;
	/** Jelentkezés-bejegyzésnél a program neve. */
	programName?: string | null;
	oldValue: string | null;
	newValue: string | null;
};

const LABELS = {
	applicant: { field: historyFieldLabel, value: historyValue },
	event: { field: eventHistoryFieldLabel, value: eventHistoryValue },
} as const;

/** Ki módosította, melyik mezőt (és melyik programnál). */
export function HistoryChangeSummary({
	kind,
	entry,
}: {
	kind: HistoryKind;
	entry: Entry;
}) {
	return (
		<span>
			<span className="font-medium">{entry.actor ?? "Rendszer"}</span>{" "}
			módosította: {LABELS[kind].field(entry.field)}
			{entry.programName && ` (${entry.programName})`}
		</span>
	);
}

/** Régi → új érték; ha egyik sincs rögzítve, semmi. */
export function HistoryChangeDiff({
	kind,
	entry,
}: {
	kind: HistoryKind;
	entry: Entry;
}) {
	const format = LABELS[kind].value;
	const oldValue = format(entry.field, entry.oldValue);
	const newValue = format(entry.field, entry.newValue);
	if (oldValue === null && newValue === null) return null;
	return (
		<div className="break-words">
			<del className="text-text-tertiary">{oldValue ?? EMPTY}</del> →{" "}
			<ins className="no-underline">{newValue ?? EMPTY}</ins>
		</div>
	);
}
