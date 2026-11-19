import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { searchKey, TagFilter } from "./tag-filter";

const TAGS = ["ablak", "Élmény", "kezdő", "robotika"];

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
	const [selected, setSelected] = useState(initial);
	return (
		<TagFilter
			selected={selected}
			onChange={(tags) => {
				setSelected(tags);
				onChange?.(tags);
			}}
		/>
	);
}

const openChip = (user: ReturnType<typeof userEvent.setup>) =>
	user.click(screen.getByRole("button", { name: /Címke/ }));

const optionNames = () =>
	screen.queryAllByRole("option").map((o) => o.textContent);

describe("searchKey", () => {
	it("ignores case and accents", () => {
		expect(searchKey("Élmény")).toBe("elmeny");
		expect(searchKey("PROGRAMOZÁS")).toBe("programozas");
		expect(searchKey("kezdő")).toBe("kezdo");
	});
});

describe("TagFilter", () => {
	const fetchMock = vi.fn();

	beforeEach(() => {
		vi.stubGlobal("fetch", fetchMock);
		fetchMock.mockResolvedValue(json({ items: TAGS }));
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetAllMocks();
	});

	it("loads the options once, on first open", async () => {
		const user = userEvent.setup();
		render(<Harness />);
		expect(fetchMock).not.toHaveBeenCalled();

		await openChip(user);
		await waitFor(() => expect(optionNames()).toEqual(TAGS));
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(fetchMock.mock.calls[0][0]).toBe("/api/events/tags");

		await user.keyboard("{Escape}");
		await openChip(user);
		await waitFor(() => expect(optionNames()).toEqual(TAGS));
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("shows the selected tags as the chip value", async () => {
		const { unmount } = render(<Harness initial={["robotika"]} />);
		expect(
			screen.getByRole("button", { name: /Címke.*robotika/ }),
		).toBeInTheDocument();
		unmount();
		render(<Harness initial={["robotika", "kezdő"]} />);
		expect(
			screen.getByRole("button", { name: /Címke.*2 címke/ }),
		).toBeInTheDocument();
	});

	it("selects and deselects tags by clicking", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<Harness onChange={onChange} />);
		await openChip(user);
		await user.click(
			await screen.findByRole("option", { name: "robotika" }),
		);
		expect(onChange).toHaveBeenLastCalledWith(["robotika"]);
		await user.click(screen.getByRole("option", { name: "kezdő" }));
		expect(onChange).toHaveBeenLastCalledWith(["robotika", "kezdő"]);
		expect(
			screen.getByRole("option", { name: "robotika" }),
		).toHaveAttribute("aria-selected", "true");
		await user.click(screen.getByRole("option", { name: "robotika" }));
		expect(onChange).toHaveBeenLastCalledWith(["kezdő"]);
	});

	it("filters locally, ignoring case and accents, without extra requests", async () => {
		const user = userEvent.setup();
		render(<Harness />);
		await openChip(user);
		await screen.findByRole("option", { name: "ablak" });

		await user.type(screen.getByRole("combobox"), "elm");
		expect(optionNames()).toEqual(["Élmény"]);

		await user.clear(screen.getByRole("combobox"));
		await user.type(screen.getByRole("combobox"), "OB");
		expect(optionNames()).toEqual(["robotika"]);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("offers no way to create an unknown tag", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<Harness onChange={onChange} />);
		await openChip(user);
		await screen.findByRole("option", { name: "ablak" });

		await user.type(screen.getByRole("combobox"), "nemletezik{Enter}");
		expect(screen.getByText("Nincs találat")).toBeInTheDocument();
		expect(screen.queryAllByRole("option")).toHaveLength(0);
		expect(screen.queryByText(/létrehoz|hozzáad/i)).not.toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
	});

	it("is operable with the keyboard while focus stays in the input", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<Harness onChange={onChange} />);
		await openChip(user);
		await screen.findByRole("option", { name: "ablak" });
		const input = screen.getByRole("combobox");
		await user.click(input);

		expect(input).toHaveAttribute(
			"aria-activedescendant",
			screen.getByRole("option", { name: "ablak" }).id,
		);
		await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
		expect(onChange).toHaveBeenLastCalledWith(["kezdő"]);
		expect(input).toHaveFocus();

		await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}");
		expect(input).toHaveAttribute(
			"aria-activedescendant",
			screen.getByRole("option", { name: "robotika" }).id,
		);
		await user.keyboard("{Enter}");
		expect(onChange).toHaveBeenLastCalledWith(["kezdő", "robotika"]);

		await user.keyboard("{Home}{Enter}");
		expect(onChange).toHaveBeenLastCalledWith([
			"kezdő",
			"robotika",
			"ablak",
		]);
		expect(input).toHaveFocus();
	});

	it("clears the selection with the chip's clear button", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<Harness initial={["robotika"]} onChange={onChange} />);
		await user.click(
			screen.getByRole("button", { name: "Címke szűrő törlése" }),
		);
		expect(onChange).toHaveBeenLastCalledWith([]);
	});

	it("shows a skeleton while loading", async () => {
		const user = userEvent.setup();
		fetchMock.mockReturnValue(new Promise(() => {}));
		render(<Harness />);
		await openChip(user);
		expect(screen.getByLabelText("Címkék betöltése")).toHaveAttribute(
			"aria-busy",
			"true",
		);
	});

	it("shows an error with retry", async () => {
		const user = userEvent.setup();
		fetchMock.mockResolvedValueOnce(json({ error: "x" }, 500));
		render(<Harness />);
		await openChip(user);
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"A címkék nem tölthetők be.",
		);
		await user.click(screen.getByRole("button", { name: "Újra" }));
		await waitFor(() => expect(optionNames()).toEqual(TAGS));
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("redirects to login on 401", async () => {
		const user = userEvent.setup();
		const location = {
			pathname: "/events",
			search: "?year=2026",
			href: "",
		};
		vi.stubGlobal("location", location);
		fetchMock.mockResolvedValue(json({ error: "Unauthorized" }, 401));
		render(<Harness />);
		await openChip(user);
		await waitFor(() =>
			expect(location.href).toBe(
				`/login?callbackUrl=${encodeURIComponent("/events?year=2026")}`,
			),
		);
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
	});
});
