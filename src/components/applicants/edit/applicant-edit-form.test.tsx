import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicantEditValues } from "@/lib/applicants/edit-schema";
import { jsonResponse } from "../test-fixtures";
import { ApplicantEditForm, CONFLICT_MESSAGE } from "./applicant-edit-form";

const { router, toast } = vi.hoisted(() => ({
	router: { push: vi.fn(), refresh: vi.fn(), replace: vi.fn() },
	toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("sonner", () => ({ toast }));

const initialValues: ApplicantEditValues = {
	lastName: "Nagy",
	firstName: "Luca",
	birthYear: "2010",
	email: "nagy.luca@gmail.com",
	phoneNumber: "+36 30 555 1243",
	schoolName: "",
	hometown: "Budapest",
	parentLastName: "Nagy",
	parentFirstName: "Péter",
	parentMothersName: "",
	parentAddress: "",
	parentEmail: "nagy.peter@gmail.com",
	parentPhone: "",
	newsletter: false,
};
const UPDATED_AT = "2026-11-19T10:00:00.000Z";

function renderForm() {
	render(
		<ApplicantEditForm
			id="a1"
			name="Nagy Luca"
			initialValues={initialValues}
			updatedAt={UPDATED_AT}
		/>,
	);
}

const field = (label: string | RegExp) => screen.getByLabelText(label);
const saveBar = () => screen.queryByRole("region", { name: "Mentés" });

async function replace(label: string | RegExp, value: string) {
	const input = field(label);
	await userEvent.clear(input);
	if (value) await userEvent.type(input, value);
}

describe("ApplicantEditForm", () => {
	const fetchMock = vi.fn();

	beforeEach(() => vi.stubGlobal("fetch", fetchMock));
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetAllMocks();
	});

	it("is pre-filled with the loaded values", () => {
		renderForm();
		expect(
			screen.getByRole("heading", {
				level: 1,
				name: "Adatlap szerkesztése",
			}),
		).toBeInTheDocument();
		expect(field(/^Telefon/)).toHaveValue("+36 30 555 1243");
		expect(field(/^Iskola/)).toHaveValue("");
		expect(field(/^Szülő e-mail/)).toHaveValue("nagy.peter@gmail.com");
		expect(
			screen.getByRole("checkbox", {
				name: "Feliratkozott a hírlevélre",
			}),
		).not.toBeChecked();
		expect(screen.getByRole("link", { name: "Mégse" })).toHaveAttribute(
			"href",
			"/applicants/a1",
		);
	});

	it("shows the save bar only with changes and counts them", async () => {
		renderForm();
		expect(saveBar()).not.toBeInTheDocument();
		await replace(/^Telefon/, "+36 30 555 1234");
		await userEvent.type(field(/^Iskola/), "Fazekas");
		expect(saveBar()).toHaveTextContent("2 nem mentett módosítás");
	});

	it("discards changes", async () => {
		renderForm();
		await replace(/^Telefon/, "+36 30 555 1234");
		await userEvent.click(screen.getByRole("button", { name: "Elvetés" }));
		expect(field(/^Telefon/)).toHaveValue("+36 30 555 1243");
		expect(saveBar()).not.toBeInTheDocument();
	});

	it("validates before sending (spec: invalid e-mail)", async () => {
		renderForm();
		await replace(/^E-mail/, "nagy.luca@gmail");
		await userEvent.click(screen.getByRole("button", { name: "Mentés" }));
		expect(
			await screen.findByText("Érvénytelen e-mail cím"),
		).toBeInTheDocument();
		expect(field(/^E-mail/)).toHaveAttribute("aria-invalid", "true");
		const summary = screen.getByRole("alert");
		expect(summary).toHaveTextContent("1 mező javításra szorul");
		await userEvent.click(screen.getByRole("button", { name: "E-mail" }));
		expect(field(/^E-mail/)).toHaveFocus();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("saves and returns to the detail page", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ updatedAt: UPDATED_AT }));
		renderForm();
		await replace(/^Telefon/, "+36 30 555 1234");
		await userEvent.click(screen.getByRole("button", { name: "Mentés" }));
		await waitFor(() =>
			expect(router.push).toHaveBeenCalledWith("/applicants/a1"),
		);
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe("/api/applicants/a1/edit");
		expect(JSON.parse(init.body)).toEqual({
			...initialValues,
			phoneNumber: "+36 30 555 1234",
			expectedUpdatedAt: UPDATED_AT,
		});
		expect(toast.success).toHaveBeenCalledWith("Az adatlap mentve.");
		expect(router.refresh).toHaveBeenCalled();
	});

	it("shows server field errors on the field", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse(
				{
					error: "Invalid request body",
					details: {
						fieldErrors: { parentEmail: ["Szerver: rossz cím"] },
					},
				},
				400,
			),
		);
		renderForm();
		await replace(/^Szülő e-mail/, "nagy.peter@example.com");
		await userEvent.click(screen.getByRole("button", { name: "Mentés" }));
		expect(
			await screen.findByText("Szerver: rossz cím"),
		).toBeInTheDocument();
		expect(router.push).not.toHaveBeenCalled();
	});

	it("reports a conflict and keeps the entered values", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ error: "Conflict" }, 409));
		renderForm();
		await replace(/^Település/, "Pécs");
		await userEvent.click(screen.getByRole("button", { name: "Mentés" }));
		expect(await screen.findByText(CONFLICT_MESSAGE)).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Újratöltés" }),
		).toBeInTheDocument();
		expect(field(/^Település/)).toHaveValue("Pécs");
		expect(router.push).not.toHaveBeenCalled();
	});

	it("shows a generic error for other failures", async () => {
		fetchMock.mockResolvedValue(jsonResponse({ error: "x" }, 500));
		renderForm();
		await replace(/^Település/, "Pécs");
		await userEvent.click(screen.getByRole("button", { name: "Mentés" }));
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"A mentés nem sikerült. Próbáld újra.",
			),
		);
		expect(field(/^Település/)).toHaveValue("Pécs");
	});
});

describe("ApplicantEditForm save bar placement", () => {
	it("is attached full width right above the mobile bottom nav, floating from md", async () => {
		renderForm();
		await userEvent.type(field(/^Iskola/), "X");
		expect(saveBar()).toHaveClass(
			"left-0",
			"right-0",
			"bottom-[var(--shell-bottom)]",
			"rounded-none",
			"md:left-[calc(var(--shell-left)+1.5rem)]",
			"md:rounded-full",
		);
	});
});

describe("ApplicantEditForm responsive layout", () => {
	it("stacks fields on mobile and puts the side cards after the form fields", () => {
		renderForm();
		const personal = screen.getByRole("region", {
			name: "Személyes adatok",
		});
		expect(personal.querySelector(".grid")).toHaveClass("md:grid-cols-2");
		const aside = screen.getByRole("complementary", { name: "Tudnivalók" });
		expect(
			personal.compareDocumentPosition(aside) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(aside.parentElement).toHaveClass(
			"xl:grid-cols-[minmax(0,1fr)_340px]",
		);
	});
});
