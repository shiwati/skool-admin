import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventTabs } from "./event-tabs";

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname }));

describe("EventTabs", () => {
	beforeEach(() => usePathname.mockReturnValue("/events/e1"));

	it("marks the overview as the current tab", () => {
		render(<EventTabs eventId="e1" applications={62} />);
		expect(
			screen.getByRole("link", { name: "Áttekintés" }),
		).toHaveAttribute("aria-current", "page");
		expect(
			screen.getByRole("link", { name: "Áttekintés" }),
		).toHaveAttribute("href", "/events/e1");
	});

	it("links the applicants tab to the filtered list with the count", () => {
		render(<EventTabs eventId="e1" applications={62} />);
		const link = screen.getByRole("link", { name: /Jelentkezők/ });
		expect(link).toHaveAttribute("href", "/applicants?eventIds=e1");
		expect(link).toHaveTextContent("62");
		expect(link).not.toHaveAttribute("aria-current");
	});

	it("shows the screens that do not exist yet as disabled, not as links", () => {
		render(<EventTabs eventId="e1" applications={0} />);
		for (const name of [
			"Visszajelzések",
			"Záró riport",
			"Változástörténet",
		]) {
			expect(screen.getByText(name)).toHaveAttribute(
				"aria-disabled",
				"true",
			);
			expect(
				screen.queryByRole("link", { name }),
			).not.toBeInTheDocument();
		}
	});

	it("is not current on another path", () => {
		usePathname.mockReturnValue("/events/e1/edit");
		render(<EventTabs eventId="e1" applications={0} />);
		expect(
			screen.getByRole("link", { name: "Áttekintés" }),
		).not.toHaveAttribute("aria-current");
	});
});
