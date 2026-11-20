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
	{ key: "2026", label: "2026 (idei év)" },
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

	it("shows the active year and is hidden without options", () => {
		const { unmount } = render(
			<FeedbackToolbar state={{ period: "2026" }} periods={periods} />,
		);
		expect(screen.getByText(": 2026 (idei év)")).toBeInTheDocument();
		unmount();
		render(<FeedbackToolbar state={{}} />);
		expect(
			screen.queryByRole("button", { name: /Időszak/ }),
		).not.toBeInTheDocument();
	});
});
