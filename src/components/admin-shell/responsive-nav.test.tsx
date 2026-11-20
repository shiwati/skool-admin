import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { usePathname, signOut } = vi.hoisted(() => ({
	usePathname: vi.fn(),
	signOut: vi.fn(() => new Promise<never>(() => {})),
}));
vi.mock("next/navigation", () => ({ usePathname }));
vi.mock("next-auth/react", () => ({ signOut }));

import { AdminRail } from "./admin-rail";
import { MobileTabBar, MobileTopBar } from "./mobile-nav";

const anna = {
	name: "Kovács Anna",
	email: "anna.kovacs@skool.org.hu",
	image: null,
};

describe("AdminRail", () => {
	beforeEach(() => usePathname.mockReturnValue("/applicants/abc"));

	it("lists the main items, then a single data item, with full names", () => {
		render(<AdminRail />);
		const nav = screen.getByRole("navigation", { name: "Főmenü" });
		expect(
			within(nav)
				.getAllByRole("link")
				.map((l) => l.getAttribute("aria-label") ?? l.textContent),
		).toEqual([
			"Áttekintés",
			"Jelentkezők",
			"Programok",
			"Visszajelzések",
			"Riportok",
		]);
		expect(within(nav).getByText("Visszajelz.")).toBeInTheDocument();
		expect(within(nav).getByText("admin")).toBeInTheDocument();
	});

	it("marks the active section on sub-paths", () => {
		render(<AdminRail />);
		expect(
			screen.getByRole("link", { name: "Jelentkezők" }),
		).toHaveAttribute("aria-current", "page");
	});
});

describe("MobileTabBar", () => {
	beforeEach(() => usePathname.mockReturnValue("/events"));

	it("shows the five tabs, with the active one marked", () => {
		render(<MobileTabBar />);
		const nav = screen.getByRole("navigation", { name: "Főmenü" });
		const tabs = within(nav).getAllByRole("link");
		expect(
			tabs.map((l) => l.getAttribute("aria-label") ?? l.textContent),
		).toEqual([
			"Áttekintés",
			"Jelentkezők",
			"Programok",
			"Visszajelzések",
			"Riportok",
		]);
		expect(
			within(nav).getByRole("link", { name: "Programok" }),
		).toHaveAttribute("aria-current", "page");
		expect(
			within(nav).getByRole("link", { name: "Visszajelzések" }),
		).toHaveAttribute("href", "/feedback");
	});
});

describe("MobileTopBar", () => {
	it("shows the user's details inside the avatar menu and signs out", async () => {
		render(<MobileTopBar user={anna} />);
		const trigger = screen.getByRole("button", {
			name: "Felhasználói menü",
		});
		expect(trigger).not.toHaveTextContent("anna.kovacs@skool.org.hu");
		expect(trigger).toHaveTextContent("KA");
		await userEvent.click(trigger);
		expect(
			screen.getByText("anna.kovacs@skool.org.hu"),
		).toBeInTheDocument();
		await userEvent.click(
			screen.getByRole("menuitem", { name: "Kijelentkezés" }),
		);
		expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
	});
});

describe("Mobile bars stick to the screen edges", () => {
	beforeEach(() => usePathname.mockReturnValue("/"));

	it("fixes the top bar to the top and the tab bar to the bottom", () => {
		render(
			<>
				<MobileTopBar user={anna} />
				<MobileTabBar />
			</>,
		);
		expect(screen.getByRole("banner")).toHaveClass(
			"fixed",
			"inset-x-0",
			"top-0",
		);
		expect(screen.getByRole("navigation", { name: "Főmenü" })).toHaveClass(
			"fixed",
			"inset-x-0",
			"bottom-0",
		);
	});
});
