import { metricSentence } from "./metrics";

/**
 * A záró riport fix sablonja HTML-ben. A Drive feltöltéskor Google Doccá
 * konvertálja, ezért csak egyszerű, inline stílusú elemeket használ
 * (táblázat, bekezdés, címsor); a szabad szöveget a csapat a Docsban írja
 * meg a kiemelt helyőrzők helyére.
 */

export type ReportDocumentData = {
	eventName: string;
	companyName: string | null;
	from: Date;
	to: Date;
	location: string | null;
	ageRange: string | null;
	participants: number;
	people: { role: string; organization: string; name: string }[];
	highlightedQuotes: { text: string; role: string }[];
	quotes: { text: string; role: string }[];
	metrics: { percent: number; phrase: string }[];
	recommendPercent: number | null;
};

const TZ = "Europe/Budapest";

const escape = (value: string) =>
	value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");

function formatLongDate(date: Date): string {
	return new Intl.DateTimeFormat("hu-HU", {
		timeZone: TZ,
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(date);
}

function formatTime(date: Date): string {
	return new Intl.DateTimeFormat("hu-HU", {
		timeZone: TZ,
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

function sameDay(a: Date, b: Date) {
	return formatLongDate(a) === formatLongDate(b);
}

/** „2025. május 16., 15:00–18:30” vagy több napnál „2025. július 7. – 2025. július 11.” */
export function reportDateText(from: Date, to: Date): string {
	return sameDay(from, to)
		? `${formatLongDate(from)}, ${formatTime(from)}–${formatTime(to)}`
		: `${formatLongDate(from)} – ${formatLongDate(to)}`;
}

/** „10-12” → „10–12 évesek” */
export function ageText(ageRange: string | null): string | null {
	if (!ageRange?.trim()) return null;
	const match = /^(\d{1,2})\s*[-–]\s*(\d{1,2})$/.exec(ageRange.trim());
	return match ? `${match[1]}–${match[2]} évesek` : ageRange.trim();
}

export function reportTitle(data: {
	eventName: string;
	companyName: string | null;
}): string {
	return data.companyName?.trim()
		? `${data.companyName.trim()} × Skool workshop – záró riport`
		: `${data.eventName} – záró riport`;
}

/** A Drive-fájl neve: cím + kezdő dátum. */
export function reportFileName(data: ReportDocumentData): string {
	return `${reportTitle(data)} – ${formatLongDate(data.from)}`;
}

const ACCENT = "#56C1CF";
const FONT = "font-family:Montserrat,Arial,sans-serif;";

const placeholder = (text: string) =>
	`<p style="${FONT}font-size:11pt;"><span style="background-color:#FFF59D;">[${escape(text)}]</span></p>`;

const h1 = (text: string) =>
	`<h1 style="${FONT}text-align:center;color:${ACCENT};font-size:22pt;font-weight:700;">${text}</h1>`;

const h2 = (text: string) =>
	`<h2 style="${FONT}font-size:15pt;font-weight:700;color:#000000;">${text}</h2>`;

const p = (text: string, extra = "") =>
	`<p style="${FONT}font-size:11pt;line-height:1.4;${extra}">${text}</p>`;

const pageBreak = `<p style="page-break-before:always;"></p>`;

function kpiTiles(tiles: { value: string; label: string; bg: string }[]) {
	const cells = tiles
		.map(
			(t) =>
				`<td style="background-color:${t.bg};padding:10px;border:3px solid #FFFFFF;vertical-align:top;"><p style="${FONT}font-size:22pt;font-weight:700;margin:0;">${escape(t.value)}</p><p style="${FONT}font-size:9pt;margin:0;">${escape(t.label)}</p></td>`,
		)
		.join("");
	return `<table style="width:100%;border-collapse:collapse;"><tr>${cells}</tr></table>`;
}

function quoteBlock(quotes: { text: string; role: string }[]) {
	if (quotes.length === 0) return "";
	return quotes
		.map(
			(q) =>
				`<p style="${FONT}font-size:11pt;font-style:italic;font-weight:700;"><span style="background-color:${ACCENT};color:#FFFFFF;">„${escape(q.text)}”</span> <span style="font-weight:400;font-style:normal;">— ${escape(q.role)}</span></p>`,
		)
		.join("");
}

function peopleTable(people: ReportDocumentData["people"]) {
	if (people.length === 0) {
		return placeholder("Add meg a közreműködőket (szerep, szervezet, név)");
	}
	const th = (text: string) =>
		`<td style="${FONT}font-size:9pt;color:#565F6B;padding:4px 8px;border-bottom:1px solid #E2E7EE;"><b>${text}</b></td>`;
	const td = (text: string, bold = false) =>
		`<td style="${FONT}font-size:11pt;padding:4px 8px;border-bottom:1px solid #E2E7EE;">${bold ? `<b>${escape(text)}</b>` : escape(text)}</td>`;
	const rows = people
		.map(
			(person) =>
				`<tr>${td(person.role, true)}${td(person.organization)}${td(person.name)}</tr>`,
		)
		.join("");
	return `<table style="width:100%;border-collapse:collapse;"><tr>${th("SZEREP")}${th("SZERVEZET")}${th("NÉV")}</tr>${rows}</table>`;
}

function bulletList(items: string[]) {
	return `<ul>${items.map((item) => `<li style="${FONT}font-size:11pt;line-height:1.4;">${item}</li>`).join("")}</ul>`;
}

export function renderReportHtml(data: ReportDocumentData): string {
	const title = reportTitle(data);
	const date = reportDateText(data.from, data.to);
	const place = data.location?.trim() || data.companyName?.trim() || null;
	const age = ageText(data.ageRange);

	const tiles = [
		{
			value: String(data.participants),
			label: age ? `résztvevő, ${age}` : "résztvevő",
			bg: "#FBF3A3",
		},
		{
			value: String(data.people.length),
			label: "oktató, szervező és mentor",
			bg: "#F8C8DC",
		},
		...(data.recommendPercent === null
			? []
			: [
					{
						value: `${data.recommendPercent}%`,
						label: "ajánlaná másoknak",
						bg: "#CEE4C4",
					},
				]),
	];

	const cover = [
		h1(escape(title)),
		p(
			escape([date, place].filter(Boolean).join(" · ")),
			"text-align:center;",
		),
		kpiTiles(tiles),
		placeholder(
			"Bevezető: az együttműködés háttere és a workshop rövid összefoglalója",
		),
		h2("Milyen egy Skool workshop?"),
		bulletList([
			"Középpontban a design thinking és az algoritmikus gondolkodás",
			"Siker-, történet- és élményalapú",
			"Fejleszti a problémamegoldó és gondolkodási készséget",
			"És nagyon jó móka!",
		]),
		p(
			"Módszerünkkel a diákok helyi kihívásokra terveznek megoldásokat, a programozást eszközként használva.",
		),
		h2("Miért jó ez?"),
		p(
			"Kíváncsi szemléletünkhöz hűen folytatjuk Magyarországon egyedülálló úttörő történetünket, amelyben a főszerepet a fiatalok, a szülők, a mentorok, az oktatók és a támogató partnerek kapják.",
		),
		p(
			"<b>Szakmailag</b> újragondoljuk a tanulási folyamatot és a tanár szerepét, és olyan tananyagot adunk, amely az iskolarendszerben nem érhető el. Bevonjuk a szülőket, és a támogatóink számára legfontosabb témákkal foglalkozunk.",
		),
		p(
			"<b>Érzelmileg</b> teret adunk az élményalapú tanulásnak és a közös, kreatív felfedezés örömének. A technológiához játékosan, szerethetően, emlékezetesen és ingyenesen közelítünk. Minden partnerünket meghívjuk egy jövőbe mutató utazásra.",
		),
	];

	const eventPage = [
		pageBreak,
		h1(`${escape(data.eventName)}<br>${escape(formatLongDate(data.from))}`),
		quoteBlock(data.highlightedQuotes),
		h2("Kik vettek részt?"),
		peopleTable(data.people),
		p(
			`<b>${data.participants}</b> résztvevő${age ? `, ${escape(age)}` : ""}`,
		),
		h2("Mit csináltunk?"),
		placeholder(
			"A workshop formátuma egy mondatban (helyszín, időpont, időtartam)",
		),
		placeholder(
			"A program blokkjai: blokkonként egy félkövér cím és egy rövid leírás",
		),
		p(
			"Köszönjük a mentoroknak a jó hangulatot és a gyakorlatias foglalkozást! :)",
		),
	];

	const impactPage = [
		pageBreak,
		...(data.quotes.length > 0
			? [
					h2("Mit szerettek a legjobban a lányok és a mentorok?"),
					bulletList(
						data.quotes.map(
							(q) =>
								`„${escape(q.text)}” <span style="color:#565F6B;">— ${escape(q.role)}</span>`,
						),
					),
				]
			: []),
		...(data.metrics.length > 0
			? [
					`<h2 style="${FONT}text-align:center;font-size:15pt;font-weight:700;">★ A hatás számokban ★</h2>`,
					bulletList(
						data.metrics.map((m) => {
							const sentence = escape(metricSentence(m));
							const pct = `${m.percent}%`;
							return sentence.replace(pct, `<b>${pct}</b>`);
						}),
					),
				]
			: []),
	];

	const photosPage = [
		pageBreak,
		placeholder("Fotók és a hangulatvideó linkje"),
		`<p style="${FONT}text-align:center;font-size:14pt;font-weight:700;">★ KÖSZÖNJÜK, HOGY MINDEZ MEGVALÓSULHATOTT ★</p>`,
	];

	return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><title>${escape(title)}</title></head><body>${[
		...cover,
		...eventPage,
		...impactPage,
		...photosPage,
	].join("")}</body></html>`;
}
