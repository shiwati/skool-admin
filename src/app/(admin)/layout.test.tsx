import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
	headers: async () => new Headers(),
}));
vi.mock("@/lib/session", () => ({
	requireAdmin: vi.fn(async () => ({
		user: { name: "Kovács Anna", email: "anna@skool.org.hu", image: null },
	})),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/applicants" }));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));

import AdminLayout from "./layout";

describe("(admin) layout", () => {
	it("renders one navigation per breakpoint range", async () => {
		render(await AdminLayout({ children: <p>tartalom</p> }));
		const navs = screen.getAllByRole("navigation", { name: "Főmenü" });
		expect(navs).toHaveLength(3);
		const [rail, sidebar, tabBar] = navs;
		expect(rail).toHaveClass("xl:hidden");
		expect(rail.parentElement).toHaveClass("hidden", "md:block");
		expect(sidebar).toHaveClass("hidden", "xl:flex");
		expect(tabBar).toHaveClass("md:hidden");
	});

	it("shows the topbar from tablet up and the mobile top bar below", async () => {
		render(await AdminLayout({ children: <p>tartalom</p> }));
		const [mobileTop, topbar] = screen.getAllByRole("banner");
		expect(mobileTop).toHaveClass("md:hidden");
		expect(topbar).toHaveClass("hidden", "md:flex");
	});

	it("reserves room for the bottom navigation and exposes the shell variables", async () => {
		render(await AdminLayout({ children: <p>tartalom</p> }));
		expect(screen.getByRole("main")).toHaveClass(
			"pb-[var(--shell-bottom)]",
		);
		expect(screen.getByTestId("admin-shell").className).toMatch(
			/xl:\[--shell-left:248px\]/,
		);
		expect(screen.getByText("tartalom")).toBeInTheDocument();
	});
});

describe("(admin) layout overflow guard", () => {
	it("clips horizontal overflow and leaves room for the fixed mobile top bar", async () => {
		render(await AdminLayout({ children: <p>tartalom</p> }));
		const column = screen.getByRole("main").parentElement;
		expect(column).toHaveClass("overflow-x-clip", "md:pt-0");
	});
});
