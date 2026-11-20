import { describe, expect, it } from "vitest";
import {
	isActive,
	mobileMoreItems,
	mobileTabItems,
	railItems,
	shortLabel,
} from "./nav-items";

describe("nav items per breakpoint", () => {
	it("puts the four main sections in the mobile tab bar", () => {
		expect(mobileTabItems.map((i) => i.label)).toEqual([
			"Áttekintés",
			"Jelentkezők",
			"Programok",
			"Visszajelzések",
		]);
	});

	it("puts the remaining items in the more sheet", () => {
		expect(mobileMoreItems.map((i) => i.label)).toEqual([
			"Riportok",
			"Adatforrások",
			"Adatmigráció",
			"Változásnapló",
		]);
	});

	it("gives the rail the main items and one disabled data item", () => {
		expect(railItems.main.map(shortLabel)).toEqual([
			"Áttekintés",
			"Jelentkezők",
			"Programok",
			"Visszajelz.",
			"Riportok",
		]);
		expect(railItems.data.label).toBe("Adatok");
		expect(railItems.data.href).toBeUndefined();
	});

	it("keeps sections active on sub-paths", () => {
		expect(isActive("/applicants", "/applicants/abc")).toBe(true);
		expect(isActive("/", "/applicants")).toBe(false);
	});
});
