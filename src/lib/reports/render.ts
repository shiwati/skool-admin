import type { FeedbackRoleKey } from "@/lib/feedback/questions";

/**
 * A záró riport fix sablonja HTML-ben, a ZR1–ZR6 dizájn alapján (egy
 * alkalomra: borító, az alkalom, a hatás, fotók). A Drive feltöltéskor Google
 * Doccá konvertálja, ezért csak olyat használ, amit a konverzió megtart:
 * táblázatok (színes cellák helyettesítik a dobozokat és a rácsot), inline
 * stílusú bekezdések és spanek, `data:` URI kép. A szabad szöveget a csapat a
 * Docsban írja meg a sárga helyőrzők helyére.
 */

export type ReportQuote = { text: string; role: string; kind: FeedbackRoleKey };

export type ReportDocumentData = {
	eventName: string;
	companyName: string | null;
	from: Date;
	to: Date;
	location: string | null;
	ageRange: string | null;
	participants: number;
	people: { role: string; organization: string; name: string }[];
	highlightedQuotes: ReportQuote[];
	quotes: ReportQuote[];
	metrics: { key: string; percent: number; phrase: string }[];
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

function formatWeekday(date: Date): string {
	return new Intl.DateTimeFormat("hu-HU", {
		timeZone: TZ,
		weekday: "long",
	}).format(date);
}

function formatMonth(date: Date): string {
	return new Intl.DateTimeFormat("hu-HU", {
		timeZone: TZ,
		year: "numeric",
		month: "long",
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

// --- Design tokens (ZR boards) -------------------------------------------

const C = {
	ink: "#121417",
	muted: "#565F6B",
	line: "#E2E7EE",
	sky: "#A6C7E7",
	peach: "#FBC999",
	lemon: "#FBF3A3",
	pink: "#F8C8DC",
	sage: "#CEE4C4",
	subtle: "#F6F8FB",
	mentorQuote: "#EEF4FB",
	placeholder: "#FFF59D",
	black: "#0F0F0F",
};

const SANS = "font-family:Poppins,Arial,sans-serif;";
const MONO = "font-family:'Roboto Mono',monospace;";

type Style = string;

const span = (text: string, style: Style) =>
	`<span style="${style}">${text}</span>`;

const para = (html: string, style: Style = "") =>
	`<p style="${SANS}color:${C.ink};font-size:10.5pt;line-height:1.45;margin:0 0 6pt 0;${style}">${html}</p>`;

/** Kis, nagybetűs mono felirat (a dizájn „kicker”-e). */
const kicker = (text: string, style: Style = "") =>
	para(
		span(
			escape(text.toUpperCase()),
			`${MONO}font-size:8.5pt;font-weight:700;letter-spacing:1pt;`,
		),
		`margin:0 0 4pt 0;${style}`,
	);

const heading = (text: string, size: number, style: Style = "") =>
	para(
		span(text, `${SANS}font-size:${size}pt;font-weight:900;`),
		`line-height:1.15;margin:0 0 6pt 0;${style}`,
	);

const mono = (text: string, style: Style = "") =>
	para(span(text, `${MONO}font-size:9pt;`), `margin:0 0 4pt 0;${style}`);

const placeholder = (text: string) =>
	para(
		span(`[${escape(text)}]`, `background-color:${C.placeholder};`),
		`color:${C.muted};`,
	);

const spacer = (pt = 10) =>
	`<p style="font-size:${pt}pt;line-height:1;margin:0;">&nbsp;</p>`;

const pageBreak = `<p style="page-break-before:always;margin:0;"></p>`;

/** Fekete pötty mono számmal (a dizájn „pill”-je). */
const pill = (text: string) =>
	span(
		`&nbsp;${escape(text)}&nbsp;`,
		`${MONO}background-color:${C.black};color:#FFFFFF;font-size:9pt;font-weight:700;`,
	);

type Cell = { html: string; bg?: string; width?: string; style?: Style };

/**
 * Keret nélküli táblázat; a cellák közti fehér keret adja a dizájn
 * rácsközét. A Docs a cellaháttért és a paddinget megtartja.
 */
function table(rows: Cell[][], gap = 4, style: Style = "") {
	const body = rows
		.map(
			(row) =>
				`<tr>${row
					.map(
						(cell) =>
							`<td style="vertical-align:top;padding:10pt 12pt;border:${gap}pt solid #FFFFFF;${cell.bg ? `background-color:${cell.bg};` : ""}${cell.width ? `width:${cell.width};` : ""}${cell.style ?? ""}">${cell.html}</td>`,
					)
					.join("")}</tr>`,
		)
		.join("");
	return `<table style="width:100%;border-collapse:collapse;${style}"><tbody>${body}</tbody></table>`;
}

/** Színes, teljes szélességű fejlécdoboz (a dizájn színsávja). */
const band = (html: string, bg: string) =>
	table([[{ html, bg, style: "padding:18pt 20pt;" }]], 0);

function chunk<T>(items: T[], size: number): T[][] {
	const out: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		out.push(items.slice(i, i + size));
	}
	return out;
}

function tile(value: string, label: string, bg: string): Cell {
	return {
		bg,
		width: "25%",
		html:
			para(
				span(escape(value), `${SANS}font-size:22pt;font-weight:900;`),
				"line-height:1.1;margin:0 0 2pt 0;",
			) +
			para(escape(label), "font-size:8.5pt;line-height:1.3;margin:0;"),
	};
}

/** Négyoszlopos csemperács; az utolsó sor üres cellákkal kitöltve. */
function tileGrid(tiles: Cell[]) {
	if (tiles.length === 0) return "";
	return table(
		chunk(tiles, 4).map((row) => [
			...row,
			...Array.from({ length: 4 - row.length }, () => ({
				html: "",
				width: "25%",
			})),
		]),
	);
}

const isVolunteer = (role: string) => /mentor|önkéntes/i.test(role);

// --- Pages ---------------------------------------------------------------

function coverPage(d: ReportDocumentData, logo: string | null) {
	const title = d.companyName?.trim()
		? `${escape(d.companyName.trim())} × Skool workshop`
		: escape(d.eventName);
	const place = d.location?.trim() || d.companyName?.trim() || null;
	const age = ageText(d.ageRange);
	const logoHtml = logo
		? `<img src="${logo}" alt="Skool" width="96" height="40" style="width:96px;height:40px;">`
		: span("SKOOL", `${SANS}font-size:20pt;font-weight:900;`);

	const header = band(
		para(
			`${logoHtml}${span("&nbsp;&nbsp;×&nbsp;&nbsp;", `${SANS}font-size:16pt;font-weight:900;`)}${span("[PARTNER LOGÓ]", `${MONO}font-size:9pt;background-color:${C.placeholder};`)}`,
			"margin:0 0 14pt 0;",
		) +
			kicker("Záró riport") +
			heading(title, 28) +
			mono(
				escape(
					[formatLongDate(d.from), place].filter(Boolean).join(" · "),
				),
			),
		C.sky,
	);

	const mentorRating = d.metrics.find((m) => m.key === "mentorRating");
	const tiles = [
		tile(
			String(d.participants),
			age ? `résztvevő, ${age}` : "résztvevő",
			C.lemon,
		),
		tile(String(d.people.length), "oktató, szervező és önkéntes", C.pink),
		...(mentorRating
			? [
					tile(
						`${mentorRating.percent}%`,
						"4–5-re értékelte a mentorokat",
						C.peach,
					),
				]
			: []),
		...(d.recommendPercent === null
			? []
			: [tile(`${d.recommendPercent}%`, "ajánlaná másoknak", C.sage)]),
	];

	const why = [
		heading("Miért jó ez?", 15),
		para(
			"Kíváncsi szemléletünkhöz hűen folytatjuk Magyarországon egyedülálló úttörő történetünket, amelyben a főszerepet a fiatalok, a szülők, a mentorok, az oktatók és a támogató partnerek kapják.",
			"font-size:9.5pt;",
		),
		para(
			"<b>Szakmailag</b> újragondoljuk a tanulási folyamatot és a tanár szerepét, és olyan tananyagot adunk, amely az iskolarendszerben nem érhető el.",
			"font-size:9.5pt;",
		),
		para(
			"<b>Érzelmileg</b> teret adunk az élményalapú tanulásnak és a közös, kreatív felfedezés örömének. A technológiához játékosan, szerethetően és ingyenesen közelítünk.",
			"font-size:9.5pt;",
		),
	].join("");

	const what = [
		heading("Milyen egy Skool workshop?", 15),
		...[
			"Középpontban a design thinking és az algoritmikus gondolkodás",
			"Siker-, történet- és élményalapú",
			"Fejleszti a problémamegoldó és gondolkodási készséget",
			"És nagyon jó móka!",
		].map((text, i) =>
			para(
				`${pill(String(i + 1).padStart(2, "0"))}&nbsp;&nbsp;${span(escape(text), "font-weight:600;")}`,
				"font-size:10pt;margin:0 0 8pt 0;",
			),
		),
		para(
			"Módszerünkkel a diákok helyi kihívásokra terveznek megoldásokat, a programozást eszközként használva.",
			`font-size:9pt;color:${C.muted};`,
		),
	].join("");

	return [
		header,
		spacer(8),
		tileGrid(tiles),
		spacer(8),
		placeholder(
			"Bevezető (1. bekezdés): az együttműködés háttere – mióta dolgozunk együtt, milyen programokban",
		),
		placeholder(
			"Bevezető (2. bekezdés): a workshop röviden – hány lánynak, hol, milyen témában",
		),
		spacer(6),
		table(
			[
				[
					{ html: what, width: "50%", style: "padding:0 14pt 0 0;" },
					{ html: why, width: "50%", style: "padding:0 0 0 14pt;" },
				],
			],
			0,
		),
	].join("");
}

function eventPage(d: ReportDocumentData) {
	const age = ageText(d.ageRange);
	const place = d.location?.trim() || d.companyName?.trim() || "";
	const header = band(
		kicker(
			`Workshop · ${formatLongDate(d.from)}, ${formatWeekday(d.from)}`,
		) +
			heading(escape(d.eventName), 24) +
			mono(
				escape(
					[
						sameDay(d.from, d.to)
							? `${formatTime(d.from)} – ${formatTime(d.to)}`
							: reportDateText(d.from, d.to),
						place,
						`${d.participants} résztvevő${age ? ` · ${age}` : ""}`,
					]
						.filter(Boolean)
						.join("   ·   "),
				),
			),
		C.peach,
	);

	const quotes =
		d.highlightedQuotes.length > 0
			? table([
					d.highlightedQuotes.map((q) => ({
						bg: C.pink,
						width: `${100 / d.highlightedQuotes.length}%`,
						html:
							para(
								`„${escape(q.text)}”`,
								"font-size:10.5pt;font-weight:500;",
							) + mono(`— ${escape(q.role)}`, "margin:0;"),
					})),
				])
			: placeholder(
					"Kiemelt idézetek: jelölj ki legfeljebb 2-t az appban (★)",
				);

	const th = (text: string) =>
		`<td style="padding:0 6pt 4pt 0;border-bottom:1pt solid ${C.line};">${span(text, `${MONO}font-size:8pt;color:${C.muted};`)}</td>`;
	const td = (text: string, bold = false) =>
		`<td style="padding:5pt 6pt 5pt 0;border-bottom:1pt solid ${C.line};">${span(escape(text), `${SANS}font-size:9.5pt;${bold ? "font-weight:600;" : ""}`)}</td>`;
	const peopleTable =
		d.people.length === 0
			? placeholder("Közreműködők: add meg őket az appban")
			: `<table style="width:100%;border-collapse:collapse;"><tbody><tr>${th("SZEREP")}${th("SZERVEZET")}${th("NÉV")}</tr>${d.people
					.map(
						(p) =>
							`<tr>${td(p.role, true)}${td(p.organization)}${td(p.name)}</tr>`,
					)
					.join("")}</tbody></table>`;

	const volunteers = d.people.filter((p) => isVolunteer(p.role));
	const countBox = [
		para(
			`${span(String(d.participants), `${SANS}font-size:30pt;font-weight:900;`)}&nbsp;&nbsp;${span(escape(age ? `résztvevő, ${age}` : "résztvevő"), "font-size:9.5pt;")}`,
			"margin:0 0 8pt 0;",
		),
		...(volunteers.length > 0
			? [
					para(
						`${span(String(volunteers.length), `${SANS}font-size:22pt;font-weight:900;`)}&nbsp;&nbsp;${span("önkéntes mentor", "font-size:9.5pt;")}`,
						`margin:0 0 4pt 0;border-top:1pt solid ${C.line};padding-top:6pt;`,
					),
					para(
						escape(
							volunteers
								.map((v) =>
									v.organization
										? `${v.name} (${v.organization})`
										: v.name,
								)
								.join(", "),
						),
						`font-size:8.5pt;color:${C.muted};margin:0;`,
					),
				]
			: []),
	].join("");

	const agenda = [1, 2, 3, 4]
		.map((n) =>
			table(
				[
					[
						{
							html: para(
								pill(String(n).padStart(2, "0")),
								"margin:0;",
							),
							width: "8%",
							style: "padding:2pt 0 0 0;",
						},
						{
							html:
								para(
									span(
										`[${n}. blokk címe]`,
										`background-color:${C.placeholder};font-weight:700;`,
									),
									"margin:0 0 2pt 0;",
								) +
								para(
									span(
										"[Rövid leírás: mit csináltak a lányok ebben a részben]",
										`background-color:${C.placeholder};`,
									),
									`margin:0;font-size:9.5pt;color:${C.muted};`,
								),
							style: "padding:0 0 8pt 0;",
						},
					],
				],
				0,
			),
		)
		.join("");

	return [
		pageBreak,
		header,
		spacer(8),
		quotes,
		spacer(6),
		heading("Kik vettek részt?", 16),
		table(
			[
				[
					{
						html: peopleTable,
						width: "60%",
						style: "padding:0 14pt 0 0;",
					},
					{
						html: countBox,
						width: "40%",
						bg: C.subtle,
						style: "padding:12pt;",
					},
				],
			],
			0,
		),
		spacer(8),
		heading("Mit csináltunk?", 16),
		placeholder(
			"A workshop formátuma egy mondatban (pl. félnapos, kihelyezett program, időpont)",
		),
		agenda,
		para(
			"Köszönjük a mentoroknak a jó hangulatot és a gyakorlatias foglalkozást!",
			"font-weight:500;",
		),
	].join("");
}

function impactPage(d: ReportDocumentData) {
	const strip = table(
		[
			[
				{
					html: para("&nbsp;", "font-size:3pt;margin:0;"),
					bg: C.peach,
					style: "padding:2pt;",
				},
			],
		],
		0,
	);
	const header =
		kicker(`Workshop · ${formatLongDate(d.from)}`) +
		heading("★ A hatás számokban ★", 22) +
		mono(
			"A résztvevők válaszainak aránya a visszajelző űrlapon",
			`color:${C.muted};`,
		);

	const stats =
		d.metrics.length > 0
			? tileGrid(
					d.metrics.map((m) =>
						tile(
							`${m.percent}%`,
							m.phrase,
							m.percent === 100 ? C.subtle : C.peach,
						),
					),
				)
			: placeholder(
					"Nincs megjeleníthető mutató (nincs résztvevői visszajelzés)",
				);

	const girls = d.quotes.filter((q) => q.kind === "PARTICIPANT");
	const mentors = d.quotes.filter((q) => q.kind === "MENTOR");
	const quoteCell = (q: ReportQuote | undefined, bg: string): Cell =>
		q
			? {
					bg,
					html: para(
						`„${escape(q.text)}”`,
						"font-size:9.5pt;margin:0;",
					),
				}
			: { html: "" };
	const rows = Math.max(girls.length, mentors.length);
	const quoteSection =
		rows === 0
			? placeholder("Idézetek: válassz ki legfeljebb 8-at az appban")
			: table(
					[
						[
							{
								html: kicker("A lányok", "margin:0;"),
								width: "58%",
								style: "padding:0 0 4pt 0;",
							},
							{
								html: kicker("A mentorok", "margin:0;"),
								width: "42%",
								style: "padding:0 0 4pt 0;",
							},
						],
						...Array.from({ length: rows }, (_, i) => [
							quoteCell(girls[i], C.lemon),
							quoteCell(mentors[i], C.mentorQuote),
						]),
					],
					3,
				);

	return [
		pageBreak,
		strip,
		spacer(6),
		header,
		spacer(6),
		stats,
		spacer(10),
		heading("Mi tetszett a legjobban?", 16),
		quoteSection,
	].join("");
}

function photosPage(d: ReportDocumentData) {
	const photo = (caption: string): Cell => ({
		width: "50%",
		style: `border:1pt dashed #8A93A0;padding:48pt 12pt;text-align:center;`,
		html: para(
			span(
				`[Fotó: ${escape(caption)}]`,
				`background-color:${C.placeholder};`,
			),
			`text-align:center;color:${C.muted};font-size:9pt;margin:0;`,
		),
	});
	const names = d.people.map((p) => p.name).filter(Boolean);
	const company = d.companyName?.trim();

	const thanks = band(
		heading("★ Köszönjük, hogy mindez megvalósulhatott! ★", 18) +
			placeholder(
				company
					? `Köszönetnyilvánítás: köszönet a ${company}-nek a helyszínért, a mentoroknak és az önkénteseknek`
					: "Köszönetnyilvánítás: a helyszín, a mentorok és az önkéntesek",
			) +
			(names.length > 0
				? mono(escape(names.join(" · ")), "margin:6pt 0;")
				: "") +
			mono("hello@skool.org.hu   ·   skool.org.hu", "margin:6pt 0 0 0;"),
		C.sky,
	);

	return [
		pageBreak,
		kicker("Fotók és videók"),
		heading("Pillanatok a workshopról", 22),
		spacer(6),
		para(
			`${span("&nbsp;&nbsp;&nbsp;", `background-color:${C.peach};`)}&nbsp;&nbsp;${span(escape(`${d.eventName} · ${formatLongDate(d.from)}`), "font-weight:700;")}`,
		),
		table([[photo("csoportkép"), photo("mentorok és szervezők")]], 4),
		para(
			`${span("Fotóalbum →", `${MONO}font-size:9pt;font-weight:700;text-decoration:underline;`)} ${span("[link]", `background-color:${C.placeholder};`)}&nbsp;&nbsp;&nbsp;&nbsp;${span("Hangulatvideó →", `${MONO}font-size:9pt;font-weight:700;text-decoration:underline;`)} ${span("[link]", `background-color:${C.placeholder};`)}`,
			"margin:6pt 0 0 0;",
		),
		spacer(14),
		thanks,
		spacer(10),
		mono(
			escape(
				`${company ? `${company} × Skool` : d.eventName} · ${formatMonth(d.from)}   ·   skool.org.hu`,
			),
			`color:${C.muted};`,
		),
	].join("");
}

export function renderReportHtml(
	data: ReportDocumentData,
	options: { logoDataUri?: string | null } = {},
): string {
	const title = reportTitle(data);
	return `<!doctype html><html lang="hu"><head><meta charset="utf-8"><title>${escape(title)}</title></head><body style="${SANS}">${[
		coverPage(data, options.logoDataUri ?? null),
		eventPage(data),
		impactPage(data),
		photosPage(data),
	].join("")}</body></html>`;
}
