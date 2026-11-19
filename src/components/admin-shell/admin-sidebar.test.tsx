import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

import { AdminSidebar } from "./admin-sidebar";

describe("AdminSidebar", () => {
	beforeEach(() => usePathname.mockReturnValue("/applicants"));

	it("lists the menu items in order under the two groups", () => {
		render(<AdminSidebar />);
		const nav = screen.getByRole("navigation", { name: "Főmenü" });
		const labels = within(nav)
			.getAllByRole("link")
			.map((link) => link.textContent);
		expect(labels).toEqual([
			"Áttekintés",
			"Jelentkezők",
			"Programok",
			"Visszajelzések",
			"Riportok",
			"Adatforrások",
			"Adatmigráció",
			"Változásnapló",
		]);
		expect(within(nav).getByText("Adatok")).toBeInTheDocument();
		expect(within(nav).getByText("admin")).toBeInTheDocument();
	});

	it("links the available screens", () => {
		render(<AdminSidebar />);
		expect(
			screen.getByRole("link", { name: "Áttekintés" }),
		).toHaveAttribute("href", "/");
		expect(
			screen.getByRole("link", { name: "Jelentkezők" }),
		).toHaveAttribute("href", "/applicants");
	});

	it("marks only the current section as the current page", () => {
		render(<AdminSidebar />);
		const current = screen
			.getAllByRole("link")
			.filter((link) => link.getAttribute("aria-current") === "page");
		expect(current.map((link) => link.textContent)).toEqual([
			"Jelentkezők",
		]);
	});

	it("keeps the section active on nested paths, and / only on itself", () => {
		usePathname.mockReturnValue("/applicants/abc");
		render(<AdminSidebar />);
		expect(
			screen.getByRole("link", { name: "Jelentkezők" }),
		).toHaveAttribute("aria-current", "page");
		expect(
			screen.getByRole("link", { name: "Áttekintés" }),
		).not.toHaveAttribute("aria-current");
	});

	it("renders future screens as disabled, non-navigating items", () => {
		render(<AdminSidebar />);
		const programs = screen.getByRole("link", { name: "Riportok" });
		expect(programs).toHaveAttribute("aria-disabled", "true");
		expect(programs).not.toHaveAttribute("href");
		expect(programs.tagName).toBe("SPAN");
	});
});
