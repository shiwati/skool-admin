import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("NotFound", () => {
	it("shows the Hungarian not-found page with a link to the dashboard", () => {
		render(<NotFound />);

		expect(
			screen.getByRole("heading", { name: "Az oldal nem található" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Lehet, hogy az oldalt áthelyezték, vagy hibás a hivatkozás.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Vissza a kezdőlapra" }),
		).toHaveAttribute("href", "/");
	});
});
