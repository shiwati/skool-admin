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

	it("links the applicants tab to the program's own page with the count", () => {
		render(<EventTabs eventId="e1" applications={62} />);
		const link = screen.getByRole("link", { name: /Jelentkezők/ });
		expect(link).toHaveAttribute("href", "/events/e1/applicants");
		expect(link).toHaveTextContent("62");
		expect(link).not.toHaveAttribute("aria-current");
	});

	it("marks the applicants tab current on its page", () => {
		usePathname.mockReturnValue("/events/e1/applicants");
		render(<EventTabs eventId="e1" applications={62} />);
		expect(
			screen.getByRole("link", { name: /Jelentkezők/ }),
		).toHaveAttribute("aria-current", "page");
	});

	it("links the report tab and marks it current on its page", () => {
		usePathname.mockReturnValue("/events/e1/report");
		render(<EventTabs eventId="e1" applications={0} />);
		const link = screen.getByRole("link", { name: "Záró riport" });
		expect(link).toHaveAttribute("href", "/events/e1/report");
		expect(link).toHaveAttribute("aria-current", "page");
	});

	it("has no change history tab (the log opens from „Teljes napló”)", () => {
		render(<EventTabs eventId="e1" applications={0} />);
		expect(screen.queryByText("Változástörténet")).not.toBeInTheDocument();
	});

	it("links the feedback tab and marks it current on its page", () => {
		usePathname.mockReturnValue("/events/e1/feedback");
		render(<EventTabs eventId="e1" applications={0} />);
		const link = screen.getByRole("link", { name: "Visszajelzések" });
		expect(link).toHaveAttribute("href", "/events/e1/feedback");
		expect(link).toHaveAttribute("aria-current", "page");
		expect(
			screen.getByRole("link", { name: "Áttekintés" }),
		).not.toHaveAttribute("aria-current");
	});

	it("is not current on another path", () => {
		usePathname.mockReturnValue("/events/e1/edit");
		render(<EventTabs eventId="e1" applications={0} />);
		expect(
			screen.getByRole("link", { name: "Áttekintés" }),
		).not.toHaveAttribute("aria-current");
	});
});
