import {
	Calendar,
	FileText,
	LayoutGrid,
	MessageSquare,
	Users,
	type LucideIcon,
} from "lucide-react";

export type NavItem = {
	label: string;
	icon: LucideIcon;
	href: string;
	/** Rövidebb felirat az ikonsávhoz és az alsó navigációhoz. */
	shortLabel?: string;
};

/** A főmenü elemei: az oldalsáv, a tablet ikonsáv és a mobil alsó sáv is ezt használja. */
export const navItems: NavItem[] = [
	{ label: "Áttekintés", icon: LayoutGrid, href: "/" },
	{ label: "Jelentkezők", icon: Users, href: "/applicants" },
	{ label: "Programok", icon: Calendar, href: "/events" },
	{
		label: "Visszajelzések",
		shortLabel: "Visszajelz.",
		icon: MessageSquare,
		href: "/feedback",
	},
	{ label: "Riportok", icon: FileText, href: "/reports" },
];

/** Rövid felirat a keskeny navigációkhoz; a teljes név az akadálymentes név. */
export function shortLabel(item: NavItem): string {
	return item.shortLabel ?? item.label;
}

/** A `/` csak pontos egyezésre aktív, a többi szakasz az alútvonalain is. */
export function isActive(href: string, pathname: string): boolean {
	if (href === "/") return pathname === "/";
	return pathname === href || pathname.startsWith(`${href}/`);
}
