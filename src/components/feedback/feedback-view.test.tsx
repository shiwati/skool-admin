import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace: vi.fn(), push, refresh: vi.fn() }),
	usePathname: () => "/feedback",
}));

import type { FeedbackListPage } from "@/lib/feedback/list";
import { FeedbackView } from "./feedback-view";

const data: FeedbackListPage = {
	items: [
		{
			id: "f1",
			role: "PARTICIPANT",
			eventId: "e1",
			eventName: "Python alapok – ősz",
			submittedAt: "2026-11-10T09:00:00.000Z",
			overallScore: 4.8,
			recommend: null,
			answers: {},
		},
	],
	total: 1,
	page: 1,
	pageSize: 25,
	stats: {
		count: 1,
		averageScore: 4.8,
		recommendRate: null,
		responseRate: null,
	},
};

function renderView() {
	render(
		<FeedbackView
			data={data}
			state={{}}
			basePath="/feedback"
			events={[{ id: "e1", name: "Python alapok – ősz" }]}
			openItem={null}
		/>,
	);
}

describe("FeedbackView responsive variants (07.1)", () => {
	it("shows cards on mobile that open the details, and the table from md", () => {
		renderView();
		const list = screen.getByRole("list", { name: "Visszajelzések" });
		expect(list).toHaveClass("md:hidden");
		const card = within(list).getByRole("link");
		expect(card).toHaveAttribute("href", "/feedback?open=f1");
		expect(card).toHaveTextContent("Python alapok – ősz");
		expect(card).toHaveTextContent("4,8");
		expect(screen.getByTestId("feedback-table-frame")).toHaveClass(
			"relative",
			"hidden",
			"md:block",
		);
	});

	it("opens the details when any cell of the table row is clicked", () => {
		push.mockClear();
		renderView();
		const table = within(screen.getByTestId("feedback-table-frame"));
		fireEvent.click(table.getByText("4,8"));
		expect(push).toHaveBeenCalledWith("/feedback?open=f1", {
			scroll: false,
		});
	});

	it("uses a two-column KPI grid on mobile", () => {
		renderView();
		const grid = screen.getByText("Kitöltések").closest("dl");
		expect(grid).toHaveClass("grid-cols-2", "xl:grid-cols-4");
	});
});
