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
};

export type NavGroup = { label: string; items: NavItem[] };

export const navGroups: NavGroup[] = [
	{
		label: "Főmenü",
		items: [
			{ label: "Áttekintés", icon: LayoutGrid, href: "/" },
			{ label: "Jelentkezők", icon: Users, href: "/applicants" },
			{ label: "Programok", icon: Calendar, href: "/events" },
			{ label: "Visszajelzések", icon: MessageSquare, href: "/feedback" },
			{ label: "Riportok", icon: FileText },
		],
	},
	{
		label: "Adatok",
		items: [
			{ label: "Adatforrások", icon: RefreshCw },
			{ label: "Adatmigráció", icon: Database },
			{ label: "Változásnapló", icon: History },
		],
	},
];

/** A `/` csak pontos egyezésre aktív, a többi szakasz az alútvonalain is. */
export function isActive(href: string, pathname: string): boolean {
	if (href === "/") return pathname === "/";
	return pathname === href || pathname.startsWith(`${href}/`);
}
