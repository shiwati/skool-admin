import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApplicantCardList } from "./applicant-card-list";
import { applicant, boroka } from "./test-fixtures";

const in2026 = new Date("2026-11-19T12:00:00Z");

function renderList(
	data: Parameters<typeof ApplicantCardList>[0]["data"],
	filtersActive = false,
) {
	const handlers = { onClearFilters: vi.fn(), onReload: vi.fn() };
	render(
		<ApplicantCardList
			data={data}
			now={in2026}
			filtersActive={filtersActive}
			{...handlers}
		/>,
	);
	return handlers;
}

describe("ApplicantCardList (03.1 M)", () => {
	it("shows the card content and links to the detail page (spec scenario)", () => {
		renderList({
			status: "success",
			items: [
				applicant({
					applications: [
						...applicant().applications,
						{
							id: "app3",
							status: "ATTENDED",
							receivedAt: "2025-03-01T08:00:00.000Z",
							event: {
								id: "e3",
								name: "Mobilapp",
								from: "2025-04-10T08:00:00.000Z",
							},
						},
					],
				}),
			],
			total: 1,
		});
		const list = screen.getByRole("list", { name: "Jelentkezők" });
		const card = within(list).getByRole("link");
		expect(card).toHaveAttribute("href", "/applicants/a1");
		expect(card).toHaveTextContent("Nagy Luca");
		expect(card).toHaveTextContent("16+");
		expect(card).toHaveTextContent("nagy.luca@gmail.com");
		expect(card).toHaveTextContent("16 év · Budapest");
		expect(card).toHaveTextContent("Korábban részt vett · 2 program");
		expect(card).toHaveTextContent("Hírlevél");
		expect(within(list).queryByRole("checkbox")).not.toBeInTheDocument();
	});

	it("marks first-time applicants and leaves out missing parts", () => {
		renderList({
			status: "success",
			items: [{ ...boroka, birthYear: null, hometown: null }],
			total: 1,
		});
		const card = screen.getByRole("link");
		expect(card).toHaveTextContent("Első jelentkezés");
		expect(card).not.toHaveTextContent("Hírlevél");
		expect(card).not.toHaveTextContent("év");
		expect(card).not.toHaveTextContent("16+");
	});

	it("shows only the settlement when the age is unknown", () => {
		renderList({
			status: "success",
			items: [applicant({ birthYear: null })],
			total: 1,
		});
		expect(screen.getByText("Budapest")).toBeInTheDocument();
	});

	it("shows skeleton cards while loading", () => {
		renderList({ status: "loading" });
		expect(screen.getAllByTestId("skeleton-card")).toHaveLength(5);
		expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "true");
	});

	it("shows the empty state with a clear action when filtering", async () => {
		const { onClearFilters } = renderList(
			{ status: "success", items: [], total: 0 },
			true,
		);
		expect(
			screen.getByText("Nincs a szűrésnek megfelelő jelentkező"),
		).toBeInTheDocument();
		await userEvent.click(
			screen.getByRole("button", { name: "Szűrők törlése" }),
		);
		expect(onClearFilters).toHaveBeenCalledOnce();
	});

	it("shows the error state and retries", async () => {
		const { onReload } = renderList({ status: "error" });
		expect(screen.getByRole("alert")).toHaveTextContent(
			"Nem sikerült betölteni a listát",
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Újratöltés" }),
		);
		expect(onReload).toHaveBeenCalledOnce();
	});
});
