import {
	Calendar,
	Database,
	FileText,
	History,
	LayoutGrid,
	MessageSquare,
	RefreshCw,
	Users,
	type LucideIcon,
} from "lucide-react";

export type NavItem = {
	label: string;
	icon: LucideIcon;
	/** Hiányzik, ha a képernyő még nem létezik: a menüpont letiltva jelenik meg. */
	href?: string;
	/** Rövidebb felirat az ikonsávhoz és az alsó navigációhoz. */
	shortLabel?: string;
	/** Mobilon: az alsó navigáció füle, vagy a „Több” lap eleme. */
	mobile?: "tab" | "more";
};

export type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
	{
		label: "Főmenü",
		items: [
			{ label: "Áttekintés", icon: LayoutGrid, href: "/", mobile: "tab" },
			{
				label: "Jelentkezők",
				icon: Users,
				href: "/applicants",
				mobile: "tab",
			},
			{
				label: "Programok",
				icon: Calendar,
				href: "/events",
				mobile: "tab",
			},
			{
				label: "Visszajelzések",
				shortLabel: "Visszajelz.",
				icon: MessageSquare,
				href: "/feedback",
				mobile: "tab",
			},
			{ label: "Riportok", icon: FileText, mobile: "more" },
		],
	},
	{
		label: "Adatok",
		items: [
			{ label: "Adatforrások", icon: RefreshCw, mobile: "more" },
			{ label: "Adatmigráció", icon: Database, mobile: "more" },
			{ label: "Változásnapló", icon: History, mobile: "more" },
		],
	},
];

const allItems = navGroups.flatMap((group) => group.items);

/** Mobil alsó navigáció fülei (a „Több” nélkül). */
export const mobileTabItems = allItems.filter((item) => item.mobile === "tab");

/** A mobil „Több” lap elemei. */
export const mobileMoreItems = allItems.filter(
	(item) => item.mobile === "more",
);

/**
 * A tablet ikonsáv: a „Főmenü” elemei, majd egyetlen „Adatok” elem, ami az
 * első elérhető adat-képernyőre visz (amíg egy sincs, letiltott).
 */
export const railItems: { main: NavItem[]; data: NavItem } = {
	main: navGroups[0].items,
	data: {
		label: "Adatok",
		icon: Database,
		href: navGroups[1].items.find((item) => item.href)?.href,
	},
};

/** Rövid felirat a keskeny navigációkhoz; a teljes név az akadálymentes név. */
export function shortLabel(item: NavItem): string {
	return item.shortLabel ?? item.label;
}

/** A `/` csak pontos egyezésre aktív, a többi szakasz az alútvonalain is. */
export function isActive(href: string, pathname: string): boolean {
	if (href === "/") return pathname === "/";
	return pathname === href || pathname.startsWith(`${href}/`);
}
