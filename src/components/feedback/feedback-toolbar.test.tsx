import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace }),
	usePathname: () => "/feedback",
}));

import { FeedbackToolbar } from "./feedback-toolbar";

const periods = [
	{ key: "2026", label: "2026" },
	{ key: "2025", label: "2025" },
];

describe("FeedbackToolbar period filter", () => {
	it("puts the selected year in the URL and resets the page", async () => {
		const user = userEvent.setup();
		render(
			<FeedbackToolbar
				state={{ role: "PARTICIPANT", page: 3 }}
				events={[]}
				periods={periods}
			/>,
		);
		await user.click(screen.getByRole("button", { name: /Időszak/ }));
		await user.click(screen.getByRole("radio", { name: "2025" }));
		expect(replace).toHaveBeenCalledWith(
			"/feedback?role=PARTICIPANT&period=2025",
			{ scroll: false },
		);
	});

	it("puts the selected company in the URL and can clear it", async () => {
		const user = userEvent.setup();
		replace.mockClear();
		const { unmount } = render(
			<FeedbackToolbar
				state={{ role: "MENTOR", page: 2 }}
				events={[]}
				companies={["Alfa Zrt.", "Béta Kft."]}
			/>,
		);
		await user.click(screen.getByRole("button", { name: /^Cég/ }));
		await user.click(screen.getByRole("radio", { name: "Béta Kft." }));
		expect(replace).toHaveBeenCalledWith(
			"/feedback?role=MENTOR&company=B%C3%A9ta+Kft.",
			{ scroll: false },
		);
		unmount();

		replace.mockClear();
		render(
			<FeedbackToolbar
				state={{ company: "Alfa Zrt." }}
				companies={["Alfa Zrt."]}
			/>,
		);
		expect(screen.getByText(": Alfa Zrt.")).toBeInTheDocument();
		await user.click(
			screen.getByRole("button", { name: "Cég szűrő törlése" }),
		);
		expect(replace).toHaveBeenCalledWith("/feedback", { scroll: false });
	});

	it("shows the active year and is hidden without options", () => {
		const { unmount } = render(
			<FeedbackToolbar state={{ period: "2026" }} periods={periods} />,
		);
		expect(screen.getByText(": 2026")).toBeInTheDocument();
		unmount();
		render(<FeedbackToolbar state={{}} />);
		expect(
			screen.queryByRole("button", { name: /Időszak/ }),
		).not.toBeInTheDocument();
	});
});
