import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signIn } = vi.hoisted(() => ({
	signIn: vi.fn(() => new Promise<never>(() => {})),
}));
vi.mock("next-auth/react", () => ({ signIn }));

import { GoogleSignInButton } from "./google-sign-in-button";

describe("GoogleSignInButton", () => {
	beforeEach(() => vi.clearAllMocks());

	it("renders the given label with the Google icon", () => {
		render(
			<GoogleSignInButton
				label="Bejelentkezés Google-fiókkal"
				callbackUrl="/"
			/>,
		);
		const button = screen.getByRole("button", {
			name: "Bejelentkezés Google-fiókkal",
		});
		expect(button).toBeEnabled();
		expect(button.querySelector("svg")).toBeInTheDocument();
		expect(button).not.toHaveAttribute("aria-busy");
	});

	it("switches to the busy redirecting state and starts sign-in once", async () => {
		const user = userEvent.setup();
		render(
			<GoogleSignInButton
				label="Másik Google-fiók választása"
				callbackUrl="/applicants"
			/>,
		);
		const button = screen.getByRole("button", {
			name: "Másik Google-fiók választása",
		});
		await user.click(button);

		const busy = screen.getByRole("button", {
			name: "Átirányítás a Google-höz…",
		});
		expect(busy).toBeDisabled();
		expect(busy).toHaveAttribute("aria-busy", "true");
		expect(screen.getByTestId("spinner")).toBeInTheDocument();
		expect(signIn).toHaveBeenCalledTimes(1);
		expect(signIn).toHaveBeenCalledWith("google", {
			callbackUrl: "/applicants",
		});

		// Disabled button ignores further clicks.
		fireEvent.click(busy);
		await user.click(busy);
		expect(signIn).toHaveBeenCalledTimes(1);
	});

	it("resets when the page is restored from the back/forward cache", () => {
		render(<GoogleSignInButton label="Belépés" callbackUrl="/" />);
		fireEvent.click(screen.getByRole("button", { name: "Belépés" }));
		expect(
			screen.getByRole("button", { name: "Átirányítás a Google-höz…" }),
		).toBeDisabled();

		const event = new Event("pageshow");
		Object.defineProperty(event, "persisted", { value: true });
		act(() => {
			window.dispatchEvent(event);
		});

		fireEvent.click(screen.getByRole("button", { name: "Belépés" }));
		expect(signIn).toHaveBeenCalledTimes(2);
	});

	it("does not start sign-in twice on a rapid double click", () => {
		render(<GoogleSignInButton label="Belépés" callbackUrl="/" />);
		const button = screen.getByRole("button", { name: "Belépés" });
		fireEvent.click(button);
		fireEvent.click(button);
		expect(signIn).toHaveBeenCalledTimes(1);
	});
});
