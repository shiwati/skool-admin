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
	it("is a placeholder without a count and with a disabled check", () => {
		render(<DuplicateBanner />);
		const banner = screen.getByRole("status");
		expect(banner).toHaveTextContent("Lehetséges duplikált jelentkezések");
		expect(banner.textContent).not.toMatch(/\d/);
		expect(
			screen.getByRole("button", { name: "Ellenőrzés" }),
		).toBeDisabled();
	});
});
