import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ErrorBoundary from "./error";
import GlobalError from "./global-error";

vi.mock("./globals.css", () => ({}));

describe.each([
	["ErrorBoundary", ErrorBoundary],
	["GlobalError", GlobalError],
])("%s", (_name, Component) => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {});
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("shows the Hungarian error page with a retry button", () => {
		render(<Component error={new Error("boom")} retry={vi.fn()} />);

		expect(
			screen.getByRole("heading", { name: "Hiba történt" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				/ha a hiba megmarad, szólj a rendszer üzemeltetőjének/,
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Próbáld újra" }),
		).toBeInTheDocument();
	});

	it("re-fetches the failed content via retry() when the button is pressed", () => {
		const retry = vi.fn();
		render(<Component error={new Error("boom")} retry={retry} />);

		fireEvent.click(screen.getByRole("button", { name: "Próbáld újra" }));

		expect(retry).toHaveBeenCalledOnce();
	});
});
