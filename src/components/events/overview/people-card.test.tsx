import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PeopleCard } from "./people-card";

function avatar(initials: string) {
	return screen.getByText(initials);
}

describe("PeopleCard", () => {
	it("colours only the instructor dark pink, the mentors light pink", () => {
		render(
			<PeopleCard
				instructor="Kiss Bence"
				mentors={["Szűcs Petra", "Nagy Ádám"]}
			/>,
		);
		expect(avatar("KB")).toHaveClass("bg-pink-strong");
		expect(avatar("SP")).toHaveClass("bg-pink-soft");
		expect(avatar("SP")).not.toHaveClass("bg-pink-strong");
		expect(avatar("NÁ")).toHaveClass("bg-pink-soft");
		expect(avatar("NÁ")).not.toHaveClass("bg-pink-strong");
	});

	it("shows the role under each name", () => {
		render(
			<PeopleCard instructor="Kiss Bence" mentors={["Szűcs Petra"]} />,
		);
		expect(screen.getByText("oktató")).toBeInTheDocument();
		expect(screen.getByText("mentor")).toBeInTheDocument();
	});

	it("shows an empty state without people", () => {
		render(<PeopleCard instructor={null} mentors={[]} />);
		expect(
			screen.getByText("Még nincs oktató vagy mentor megadva."),
		).toBeInTheDocument();
	});
});
