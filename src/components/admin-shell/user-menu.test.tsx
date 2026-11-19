import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signOut } = vi.hoisted(() => ({
	signOut: vi.fn(() => new Promise<never>(() => {})),
}));
vi.mock("next-auth/react", () => ({ signOut }));

import { AdminTopbar } from "./admin-topbar";

const anna = {
	name: "Kovács Anna",
	email: "anna.kovacs@skool.org.hu",
	image: null,
};

describe("AdminTopbar / UserMenu", () => {
	beforeEach(() => vi.clearAllMocks());

	it("shows name, e-mail and initials when there is no picture", () => {
		render(<AdminTopbar user={anna} />);
		const trigger = screen.getByRole("button", {
			name: "Felhasználói menü",
		});
		expect(trigger).toHaveTextContent("Kovács Anna");
		expect(trigger).toHaveTextContent("anna.kovacs@skool.org.hu");
		expect(trigger).toHaveTextContent("KA");
	});

	it("shows the profile picture when available", () => {
		const { container } = render(
			<AdminTopbar
				user={{ ...anna, image: "https://example.com/a.png" }}
			/>,
		);
		expect(container.querySelector("img")).toHaveAttribute(
			"src",
			"https://example.com/a.png",
		);
	});

	it("signs out to /login from the user menu", async () => {
		const user = userEvent.setup();
		render(<AdminTopbar user={anna} />);
		await user.click(
			screen.getByRole("button", { name: "Felhasználói menü" }),
		);
		await user.click(
			await screen.findByRole("menuitem", { name: "Kijelentkezés" }),
		);
		expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/login" });
	});
});
