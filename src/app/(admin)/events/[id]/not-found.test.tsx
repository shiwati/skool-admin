import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import EventNotFound from "./not-found";

describe("program not-found page", () => {
	it("explains the missing program and links back to the list", () => {
		render(<EventNotFound />);
		expect(
			screen.getByRole("heading", {
				name: "Nem található ilyen program",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Lehet, hogy a programot törölték, vagy hibás a hivatkozás.",
			),
		).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "Programok" })).toHaveAttribute(
			"href",
			"/events",
		);
	});
});
