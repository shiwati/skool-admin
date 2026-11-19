import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_STATE } from "@/lib/applicants/list-params";
import { EmailListDialog } from "./email-list-dialog";
import { applicant, jsonResponse, pageOf } from "./test-fixtures";

const { toast } = vi.hoisted(() => ({
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("sonner", () => ({ toast }));

const person = (i: number, email: string | null) =>
	applicant({ id: `p${i}`, email });

describe("EmailListDialog", () => {
	const fetchMock = vi.fn();
	const writeText = vi.fn();

	beforeEach(() => {
		vi.stubGlobal("fetch", fetchMock);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});
		writeText.mockResolvedValue(undefined);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetAllMocks();
	});

	it("collects all pages of the current filter, deduplicated", async () => {
		const first = Array.from({ length: 100 }, (_, i) =>
			person(i, `user${i}@x.hu`),
		);
		const second = [
			person(100, "USER0@x.hu"),
			person(101, null),
			person(102, "last@y.hu"),
		];
		fetchMock
			.mockResolvedValueOnce(jsonResponse(pageOf(first, 103, 1, 100)))
			.mockResolvedValueOnce(jsonResponse(pageOf(second, 103, 2, 100)));

		render(
			<EmailListDialog
				open
				onOpenChange={() => {}}
				state={{ ...DEFAULT_STATE, hometown: "Pécs", page: 3 }}
			/>,
		);

		const box = await screen.findByRole("textbox", {
			name: "101 e-mail cím",
		});
		const text = (box as HTMLTextAreaElement).value;
		expect(text.startsWith("user0@x.hu, user1@x.hu")).toBe(true);
		expect(text.endsWith("user99@x.hu, last@y.hu")).toBe(true);
		expect(text).not.toMatch(/USER0/);

		const urls = fetchMock.mock.calls.map((c) => new URL(c[0], "http://x"));
		expect(urls.map((u) => u.searchParams.get("page"))).toEqual(["1", "2"]);
		expect(urls[0].searchParams.get("pageSize")).toBe("100");
		expect(urls[0].searchParams.get("hometown")).toBe("Pécs");

		await userEvent.click(screen.getByRole("button", { name: "Másolás" }));
		expect(writeText).toHaveBeenCalledWith(text);
		expect(toast.success).toHaveBeenCalledWith(
			"101 e-mail cím a vágólapra másolva",
		);
	});

	it("says there is nothing to copy when no address exists", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(pageOf([person(1, null)], 1, 1, 100)),
		);
		render(
			<EmailListDialog
				open
				onOpenChange={() => {}}
				state={DEFAULT_STATE}
			/>,
		);
		expect(
			await screen.findByText(/Nincs másolható e-mail cím/),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Másolás" })).toBeDisabled();
	});

	it("cancels the remaining requests when closed", async () => {
		let signal: AbortSignal | undefined;
		fetchMock.mockImplementation((_url: string, init: RequestInit) => {
			signal = init.signal ?? undefined;
			return new Promise(() => {});
		});
		const onOpenChange = vi.fn();
		const { rerender } = render(
			<EmailListDialog
				open
				onOpenChange={onOpenChange}
				state={DEFAULT_STATE}
			/>,
		);
		expect(screen.getByRole("status")).toHaveTextContent("Címek gyűjtése");
		await userEvent.click(screen.getByRole("button", { name: "Mégse" }));
		expect(onOpenChange).toHaveBeenCalledWith(false);
		rerender(
			<EmailListDialog
				open={false}
				onOpenChange={onOpenChange}
				state={DEFAULT_STATE}
			/>,
		);
		await waitFor(() => expect(signal?.aborted).toBe(true));
	});

	it("shows an error with retry", async () => {
		fetchMock
			.mockResolvedValueOnce(jsonResponse({ error: "x" }, 500))
			.mockResolvedValueOnce(
				jsonResponse(pageOf([person(1, "a@x.hu")], 1, 1, 100)),
			);
		render(
			<EmailListDialog
				open
				onOpenChange={() => {}}
				state={DEFAULT_STATE}
			/>,
		);
		await userEvent.click(
			await screen.findByRole("button", { name: "Újrapróbálás" }),
		);
		expect(
			await screen.findByRole("textbox", { name: "1 e-mail cím" }),
		).toHaveValue("a@x.hu");
	});
});
