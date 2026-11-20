import { describe, expect, it } from "vitest";
import { isActive, navItems, shortLabel } from "./nav-items";

describe("nav items", () => {
	it("lists every main section in order", () => {
		expect(navItems.map((i) => i.label)).toEqual([
			"Áttekintés",
			"Jelentkezők",
			"Programok",
			"Visszajelzések",
			"Riportok",
		]);
	});

	it("shortens labels for the narrow navigations", () => {
		expect(navItems.map(shortLabel)).toEqual([
			"Áttekintés",
			"Jelentkezők",
			"Programok",
			"Visszajelz.",
			"Riportok",
		]);
	});

	it("keeps sections active on sub-paths", () => {
		expect(isActive("/applicants", "/applicants/abc")).toBe(true);
		expect(isActive("/", "/applicants")).toBe(false);
	});
});
