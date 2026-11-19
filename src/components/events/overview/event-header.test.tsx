import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EventHeader } from "./event-header";
import { overviewEvent } from "./test-fixtures";

const NOW = new Date("2026-11-19T10:00:00Z");

describe("EventHeader", () => {
	it("shows the breadcrumb, name, tags and the status", () => {
		render(
			<EventHeader
				event={overviewEvent({
					from: new Date("2026-12-01T09:00:00Z"),
				})}
				applications={10}
				now={NOW}
			/>,
		);
		expect(
			screen.getByRole("navigation", { name: "Morzsamenü" }),
		).toHaveTextContent("ProgramokPython alapok – ősz");
		expect(screen.getByRole("link", { name: "Programok" })).toHaveAttribute(
			"href",
			"/events",
		);
		expect(
			screen.getByRole("heading", {
				level: 1,
				name: "Python alapok – ősz",
			}),
		).toBeInTheDocument();
		const pills = screen.getByRole("list", { name: "Címkék és státusz" });
		expect(pills).toHaveTextContent("programozás");
		expect(pills).toHaveTextContent("Jelentkezés nyitva");
	});

	it("shows a full program as 'Betelt · várólista'", () => {
		render(
			<EventHeader
				event={overviewEvent({
					from: new Date("2026-12-01T09:00:00Z"),
					capacity: 20,
				})}
				applications={62}
				now={NOW}
			/>,
		);
		expect(screen.getByText("Betelt · várólista")).toBeInTheDocument();
	});

	it("summarises place and people, with a +N for more than two", () => {
		render(
			<EventHeader
				event={overviewEvent({ mentors: ["Szűcs Petra", "Nagy Ádám"] })}
				applications={0}
				now={NOW}
			/>,
		);
		expect(
			screen.getByText("Sigma Technology, Budapest, Infopark sétány 1."),
		).toBeInTheDocument();
		expect(
			screen.getByText("Kiss Bence, Szűcs Petra +1"),
		).toBeInTheDocument();
	});

	it("omits place and people when there are none", () => {
		render(
			<EventHeader
				event={overviewEvent({
					companyName: null,
					location: null,
					instructor: null,
					mentors: [],
				})}
				applications={0}
				now={NOW}
			/>,
		);
		expect(screen.getAllByText(/./, { selector: "p span" })).toHaveLength(
			1,
		);
	});
});
