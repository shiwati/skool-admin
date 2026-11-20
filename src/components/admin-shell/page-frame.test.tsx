import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Breadcrumb } from "./breadcrumb";
import { PageHeader } from "./page-header";
import { PageShell } from "./page-shell";

const items = [
	{ label: "Jelentkezők", href: "/applicants" },
	{ label: "Nagy Luca", href: "/applicants/a1" },
	{ label: "Szerkesztés" },
];

describe("Breadcrumb", () => {
	it("shows the full trail without a mobile back link by default", () => {
		render(<Breadcrumb items={items} />);
		const nav = screen.getByRole("navigation", { name: "Morzsamenü" });
		expect(within(nav).getByRole("list")).not.toHaveClass("hidden");
		expect(within(nav).getAllByRole("link")).toHaveLength(2);
	});

	it("adds a back link to the nearest parent on mobile", () => {
		render(<Breadcrumb items={items} mobileBack />);
		// jsdom applies no CSS: the mobile link and the trail link both exist.
		const links = screen.getAllByRole("link", { name: "Nagy Luca" });
		expect(links).toHaveLength(2);
		const mobile = links.find((l) => l.classList.contains("md:hidden"));
		expect(mobile).toHaveAttribute("href", "/applicants/a1");
		expect(screen.getByRole("list")).toHaveClass("hidden", "md:flex");
	});
});

describe("PageHeader", () => {
	it("renders mobile actions in a mobile-only container and hides actions there", () => {
		render(
			<PageHeader
				title="Jelentkezők"
				actions={<button>E-mail lista</button>}
				mobileActions={<button>További műveletek</button>}
			/>,
		);
		expect(screen.getByTestId("page-header-mobile-actions")).toHaveClass(
			"md:hidden",
		);
		expect(
			screen.getByRole("button", { name: "E-mail lista" }).parentElement,
		).toHaveClass("hidden", "md:flex");
	});

	it("lets actions take the full width on mobile without mobile actions", () => {
		render(<PageHeader title="X" actions={<button>A</button>} />);
		expect(
			screen.getByRole("button", { name: "A" }).parentElement,
		).toHaveClass("w-full", "md:w-auto");
	});
});

describe("PageShell", () => {
	it("uses the per-range paddings", () => {
		render(<PageShell data-testid="shell" />);
		expect(screen.getByTestId("shell")).toHaveClass(
			"px-4",
			"md:px-6",
			"xl:px-8",
		);
	});
});
