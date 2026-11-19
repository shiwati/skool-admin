import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button, buttonVariants } from "./button";

describe("Button", () => {
	it("renders the full-width surface pill used by the login CTA", () => {
		render(
			<Button variant="surface" size="pill">
				Bejelentkezés
			</Button>,
		);
		const button = screen.getByRole("button", { name: "Bejelentkezés" });
		for (const cls of [
			"h-11",
			"w-full",
			"rounded-full",
			"font-mono",
			"text-[13px]",
			"bg-white",
			"text-text-primary",
			"border-border-strong",
			"disabled:bg-surface-subtle",
			"disabled:opacity-100",
		]) {
			expect(button).toHaveClass(cls);
		}
		// tailwind-merge drops the conflicting defaults.
		expect(button).not.toHaveClass(
			"rounded-md",
			"text-sm",
			"disabled:opacity-50",
		);
	});

	it("keeps the existing default classes unchanged", () => {
		const classes = buttonVariants().split(" ");
		expect(classes).toEqual(
			expect.arrayContaining([
				"rounded-md",
				"text-sm",
				"h-9",
				"px-4",
				"bg-primary",
				"text-primary-foreground",
				"disabled:opacity-50",
			]),
		);
		expect(classes).not.toContain("w-full");
	});
});
