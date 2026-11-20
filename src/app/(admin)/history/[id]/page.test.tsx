import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, getHistorySubject, getHistoryEntries, notFound } =
	vi.hoisted(() => ({
		requireAdmin: vi.fn(),
		getHistorySubject: vi.fn(),
		getHistoryEntries: vi.fn(),
		notFound: vi.fn(() => {
			throw new Error("NEXT_NOT_FOUND");
		}),
	}));
vi.mock("@/lib/session", () => ({ requireAdmin }));
vi.mock("@/lib/history/queries", () => ({
	getHistorySubject,
	getHistoryEntries,
	HISTORY_PAGE_LIMIT: 200,
}));
vi.mock("next/navigation", () => ({ notFound }));

import HistoryPage, { generateMetadata } from "./page";

const props = (id = "a1") => ({ params: Promise.resolve({ id }) });

const applicant = {
	kind: "applicant",
	id: "a1",
	name: "Nagy Luca",
	applications: [],
};
const event = { kind: "event", id: "e1", name: "Python alapok – ősz" };

describe("history page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireAdmin.mockResolvedValue({ user: { id: "u1" } });
		getHistoryEntries.mockResolvedValue([]);
	});

	it("checks the session before reading data", async () => {
		requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
		await expect(HistoryPage(props("a1"))).rejects.toThrow("NEXT_REDIRECT");
		expect(requireAdmin).toHaveBeenCalledWith("/history/a1");
		expect(getHistorySubject).not.toHaveBeenCalled();
	});

	it("shows the not-found page for unknown ids", async () => {
		getHistorySubject.mockResolvedValue(null);
		await expect(HistoryPage(props("x"))).rejects.toThrow("NEXT_NOT_FOUND");
		expect(getHistoryEntries).not.toHaveBeenCalled();
	});

	it("renders an applicant's full history grouped by day", async () => {
		getHistorySubject.mockResolvedValue(applicant);
		getHistoryEntries.mockResolvedValue([
			{
				id: "h1",
				actor: "Kovács Anna",
				field: "status",
				programName: "Python alapok – ősz",
				oldValue: "APPLIED",
				newValue: "ACCEPTED",
				createdAt: new Date("2026-11-03T09:12:00Z"),
			},
			{
				id: "h2",
				actor: null,
				field: "deletedAt",
				programName: null,
				oldValue: null,
				newValue: null,
				createdAt: new Date("2026-11-03T08:00:00Z"),
			},
		]);
		render(await HistoryPage(props("a1")));

		expect(getHistoryEntries).toHaveBeenCalledWith(applicant, 200);
		expect(
			screen.getByRole("heading", { level: 1, name: "Nagy Luca" }),
		).toBeInTheDocument();
		const crumb = screen.getByRole("navigation", { name: "Morzsamenü" });
		expect(within(crumb).getByRole("list")).toHaveTextContent(
			"JelentkezőkNagy LucaVáltozástörténet",
		);
		// Trail link (md+) and the mobile "‹ Nagy Luca" back link.
		const back = within(crumb).getAllByRole("link", { name: "Nagy Luca" });
		expect(back).toHaveLength(2);
		for (const link of back) {
			expect(link).toHaveAttribute("href", "/applicants/a1");
		}
		expect(back[0]).toHaveClass("md:hidden");
		expect(
			screen.getByRole("heading", { name: "2026. november 3." }),
		).toBeInTheDocument();
		const items = screen
			.getAllByRole("listitem")
			.filter((li) => li.textContent?.includes("módosította"));
		expect(items[0]).toHaveTextContent(
			"Kovács Anna módosította: Státusz (Python alapok – ősz)",
		);
		expect(items[0]).toHaveTextContent("Új jelentkező → Elfogadva");
		expect(items[0]).toHaveTextContent("10:12");
		expect(items[1]).toHaveTextContent("Rendszer módosította: Törlés");
		expect(screen.getByText("2 változás")).toBeInTheDocument();
	});

	it("renders a program's history the same way as an applicant's", async () => {
		getHistorySubject.mockResolvedValue(event);
		render(await HistoryPage(props("e1")));
		expect(
			screen.getByRole("heading", {
				level: 1,
				name: "Python alapok – ősz",
			}),
		).toBeInTheDocument();
		const crumb = screen.getByRole("navigation", { name: "Morzsamenü" });
		expect(within(crumb).getByRole("list")).toHaveTextContent(
			"ProgramokPython alapok – őszVáltozástörténet",
		);
		expect(
			within(crumb).getByRole("link", { name: "Programok" }),
		).toHaveAttribute("href", "/events");
		for (const link of within(crumb).getAllByRole("link", {
			name: "Python alapok – ősz",
		})) {
			expect(link).toHaveAttribute("href", "/events/e1");
		}
		expect(
			screen.queryByRole("navigation", { name: "Program szakaszai" }),
		).not.toBeInTheDocument();
		expect(
			screen.getByText("Még nincs rögzített változás"),
		).toBeInTheDocument();
		expect(screen.queryByText(/0 változás/)).not.toBeInTheDocument();
		expect(
			screen.getByRole("heading", {
				name: "Mit naplózunk a programnál?",
			}),
		).toBeInTheDocument();
	});

	it("shows program fields with the program form's labels", async () => {
		getHistorySubject.mockResolvedValue(event);
		getHistoryEntries.mockResolvedValue([
			{
				id: "h1",
				actor: "Szabó Péter",
				field: "mentors",
				programName: null,
				oldValue: null,
				newValue: '["Szűcs Petra","Kiss Ádám"]',
				createdAt: new Date("2026-11-03T14:40:00Z"),
			},
		]);
		render(await HistoryPage(props("e1")));
		const item = screen
			.getAllByRole("listitem")
			.find((li) => li.textContent?.includes("módosította"));
		expect(item).toHaveTextContent("Szabó Péter módosította: Mentorok");
		expect(item).toHaveTextContent("— → Szűcs Petra, Kiss Ádám");
	});

	it("uses the subject's name in the page title", async () => {
		getHistorySubject.mockResolvedValue(event);
		expect(await generateMetadata(props("e1"))).toEqual({
			title: "Python alapok – ősz · Változástörténet",
		});
	});
});
