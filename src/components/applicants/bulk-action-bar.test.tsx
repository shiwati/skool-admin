import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BulkActionBar } from "./bulk-action-bar";

describe("BulkActionBar placement", () => {
	it("follows the shell offset and is not offered on mobile", () => {
		render(
			<BulkActionBar
				count={2}
				onCopyEmails={vi.fn()}
				onDelete={vi.fn()}
				onClear={vi.fn()}
			/>,
		);
		const wrapper = screen.getByRole("toolbar", {
			name: "Tömeges műveletek",
		}).parentElement;
		expect(wrapper).toHaveClass(
			"left-[var(--shell-left)]",
			"hidden",
			"md:flex",
		);
	});
});
