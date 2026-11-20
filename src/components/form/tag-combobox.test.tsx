import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TagCombobox } from "./tag-combobox";

const OPTIONS = [
	{ name: "programozás", count: 3 },
	{ name: "kezdő", count: 2 },
	{ name: "robotika", count: 1 },
];

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});
}

function Harness({
	initial = [],
	onChange,
}: {
	initial?: string[];
	onChange?: (tags: string[]) => void;
}) {
	const [value, setValue] = useState(initial);
	return (
		<>
			<label htmlFor="tags">Címkék</label>
			<TagCombobox
				id="tags"
				value={value}
				onChange={(tags) => {
					setValue(tags);
					onChange?.(tags);
				}}
			/>
		</>
	);
}

const input = () => screen.getByRole("combobox", { name: "Címkék" });
const optionTexts = () =>
	within(screen.getByRole("listbox", { hidden: true }))
		.queryAllByRole("option", { hidden: true })
		.map((o) => o.textContent);

describe("TagCombobox", () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		fetchMock.mockResolvedValue(json({ items: OPTIONS }));
		vi.stubGlobal("fetch", fetchMock);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		fetchMock.mockReset();
	});

	it("offers the tags in use, most used first, with counts", async () => {
		const user = userEvent.setup();
		render(<Harness />);
		await user.click(input());
		await waitFor(() =>
			expect(optionTexts()).toEqual([
				"programozás3 program",
				"kezdő2 program",
				"robotika1 program",
			]),
		);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0][0]).toBe("/api/events/tags");
	});

	it("picks an existing tag with the keyboard (spec: Picking an existing tag)", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<Harness onChange={onChange} />);
		await user.click(input());
		await user.type(input(), "prog");
		await waitFor(() =>
			expect(optionTexts()).toEqual([
				"programozás3 program",
				expect.any(String),
			]),
		);
		await user.keyboard("{Enter}");
		expect(onChange).toHaveBeenLastCalledWith(["programozás"]);
		expect(input()).toHaveValue("");
		expect(input()).toHaveFocus();
	});

	it("adds a new, normalized tag from the last option (spec: Adding a new tag)", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<Harness onChange={onChange} />);
		await user.click(input());
		await user.type(input(), "3D  Nyomtatás");
		const create = await screen.findByRole("option", {
			name: "Új címke: „3d nyomtatás”",
		});
		await user.click(create);
		expect(onChange).toHaveBeenLastCalledWith(["3d nyomtatás"]);
		expect(
			screen.getByRole("button", {
				name: "Címke eltávolítása: 3d nyomtatás",
			}),
		).toBeInTheDocument();
	});

	it("offers the existing tag instead of a near-duplicate (spec: Missing accent)", async () => {
		const user = userEvent.setup();
		render(<Harness />);
		await user.click(input());
		await user.type(input(), "Programozas");
		await waitFor(() =>
			expect(optionTexts()).toEqual(["programozás3 program"]),
		);
		expect(
			screen.queryByRole("option", { name: /Új címke/, hidden: true }),
		).not.toBeInTheDocument();
	});

	it("does not offer already selected tags or their near-duplicates", async () => {
		const user = userEvent.setup();
		render(<Harness initial={["kezdő"]} />);
		await user.click(input());
		await waitFor(() =>
			expect(optionTexts()).toEqual([
				"programozás3 program",
				"robotika1 program",
			]),
		);
		await user.type(input(), "KEZDO");
		expect(optionTexts()).toEqual([]);
	});

	it("explains an invalid text and offers no new tag", async () => {
		const user = userEvent.setup();
		render(<Harness />);
		await user.click(input());
		await user.type(input(), "a,b");
		expect(
			await screen.findByText("A címke nem tartalmazhat vesszőt."),
		).toBeInTheDocument();
		expect(
			screen.queryByRole("option", { name: /Új címke/, hidden: true }),
		).not.toBeInTheDocument();
	});

	it("removes the last tag with Backspace and closes with Escape", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<Harness initial={["robotika", "kezdő"]} onChange={onChange} />);
		await user.click(input());
		await user.keyboard("{Backspace}");
		expect(onChange).toHaveBeenLastCalledWith(["robotika"]);
		await waitFor(() =>
			expect(input()).toHaveAttribute("aria-expanded", "true"),
		);
		await user.keyboard("{Escape}");
		expect(input()).toHaveAttribute("aria-expanded", "false");
	});

	it("never submits the surrounding form on Enter", async () => {
		const user = userEvent.setup();
		const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
		render(
			<form onSubmit={onSubmit}>
				<Harness />
			</form>,
		);
		await user.click(input());
		await user.keyboard("{Enter}");
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("still allows a new tag when the suggestions cannot be loaded", async () => {
		fetchMock.mockResolvedValue(json({ error: "x" }, 500));
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<Harness onChange={onChange} />);
		await user.click(input());
		await user.type(input(), "új");
		await user.click(
			await screen.findByRole("option", { name: "Új címke: „új”" }),
		);
		expect(onChange).toHaveBeenLastCalledWith(["új"]);
	});
});
