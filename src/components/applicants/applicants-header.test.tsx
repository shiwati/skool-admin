import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApplicantsHeader } from "./applicants-header";
import { DuplicateBanner } from "./duplicate-banner";

describe("ApplicantsHeader", () => {
	it("shows the heading and the formatted total", () => {
		render(<ApplicantsHeader total={1248} onEmailList={() => {}} />);
		expect(
			screen.getByRole("heading", { level: 1, name: "Jelentkezők" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(/^Összes jelentkező: 1\s248 fő$/),
		).toBeInTheDocument();
	});

	it("labels the count as results when filtered", () => {
		render(<ApplicantsHeader total={12} filtered onEmailList={() => {}} />);
		expect(screen.getByText("Találatok száma: 12 fő")).toBeInTheDocument();
		expect(screen.queryByText(/Összes jelentkező/)).not.toBeInTheDocument();
	});

	it("omits the count until data has loaded", () => {
		render(<ApplicantsHeader total={null} onEmailList={() => {}} />);
		expect(screen.queryByText(/száma/)).not.toBeInTheDocument();
	});

	it("opens the e-mail list", async () => {
		const onEmailList = vi.fn();
		render(<ApplicantsHeader total={3} onEmailList={onEmailList} />);
		await userEvent.click(
			screen.getByRole("button", { name: "E-mail lista" }),
		);
		expect(onEmailList).toHaveBeenCalledOnce();
	});
});

describe("DuplicateBanner", () => {
	it("is hidden without pairs", () => {
		const { container } = render(
			<DuplicateBanner count={0} onReview={vi.fn()} />,
		);
		expect(container).toBeEmptyDOMElement();
	});

	it("shows the pair count and opens the review", async () => {
		const onReview = vi.fn();
		render(<DuplicateBanner count={3} onReview={onReview} />);
		expect(screen.getByRole("status")).toHaveTextContent(
			"3 lehetséges duplikált jelentkezés",
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Ellenőrzés" }),
		);
		expect(onReview).toHaveBeenCalledOnce();
	});
});

describe("ApplicantsHeader on mobile", () => {
	it("offers the e-mail list in a menu", async () => {
		const onEmailList = vi.fn();
		render(<ApplicantsHeader total={3} onEmailList={onEmailList} />);
		const trigger = screen.getByRole("button", {
			name: "További műveletek",
		});
		expect(trigger.parentElement).toHaveClass("md:hidden");
		await userEvent.click(trigger);
		await userEvent.click(
			screen.getByRole("menuitem", { name: "E-mail lista" }),
		);
		expect(onEmailList).toHaveBeenCalledOnce();
	});
});

describe("DuplicateBanner on mobile", () => {
	it("hides the explanation for a compact single line", () => {
		render(<DuplicateBanner count={3} onReview={vi.fn()} />);
		expect(screen.getByText(/Azonos névvel és e-mail címmel/)).toHaveClass(
			"hidden",
			"md:block",
		);
	});
});
