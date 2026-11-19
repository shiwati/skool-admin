import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ApplicantsHeader } from "./applicants-header";
import { DuplicateBanner } from "./duplicate-banner";

describe("ApplicantsHeader", () => {
	it("shows the heading and the formatted total", () => {
		render(<ApplicantsHeader total={1248} onEmailList={() => {}} />);
		expect(
			screen.getByRole("heading", { level: 1, name: "Jelentkezők" }),
		).toBeInTheDocument();
		expect(
			screen.getByText("Google Formból érkező jelentkezések · 1 248 fő"),
		).toBeInTheDocument();
	});

	it("omits the count until data has loaded", () => {
		render(<ApplicantsHeader total={null} onEmailList={() => {}} />);
		expect(screen.queryByText(/fő/)).not.toBeInTheDocument();
	});

	it("shows a disabled sync button with an explanation", () => {
		render(
			<TooltipProvider>
				<ApplicantsHeader total={3} onEmailList={() => {}} />
			</TooltipProvider>,
		);
		const sync = screen.getByRole("button", { name: "Szinkronizálás" });
		expect(sync).toBeDisabled();
		expect(sync).toHaveAccessibleDescription(
			"A Google Sheet szinkronizálás még nem érhető el.",
		);
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
