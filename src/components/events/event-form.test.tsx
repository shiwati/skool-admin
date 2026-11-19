import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { push, apiFetch, toastSuccess, toastError } = vi.hoisted(() => ({
	push: vi.fn(),
	apiFetch: vi.fn(),
	toastSuccess: vi.fn(),
	toastError: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({
	toast: { success: toastSuccess, error: toastError },
}));
vi.mock("@/lib/api/client", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/api/client")>()),
	apiFetch,
}));

import { ApiError } from "@/lib/api/client";
import { EventForm } from "./event-form";

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
	await user.type(screen.getByLabelText(/Program neve/), "Python alapok");
	await user.type(screen.getByLabelText(/Kezdés/), "2027-03-06T10:00");
	await user.type(screen.getByLabelText(/Befejezés/), "2027-03-06T14:00");
	await user.type(screen.getByLabelText(/Max. tanulói létszám/), "24");
}

describe("EventForm", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("lists the problems after an empty submit", async () => {
		const user = userEvent.setup();
		render(<EventForm mode="create" />);
		await user.click(
			screen.getByRole("button", { name: "Program mentése" }),
		);

		expect(
			await screen.findByText("A program nem menthető – 4 hiba"),
		).toBeInTheDocument();
		expect(apiFetch).not.toHaveBeenCalled();
		await user.click(screen.getByRole("button", { name: "Kezdés" }));
		expect(screen.getByLabelText(/Kezdés/)).toHaveFocus();
	});

	it("shows the end-before-start error on the end field", async () => {
		const user = userEvent.setup();
		render(<EventForm mode="create" />);
		await fillValid(user);
		await user.clear(screen.getByLabelText(/Befejezés/));
		await user.type(screen.getByLabelText(/Befejezés/), "2027-03-05T14:00");
		await user.click(
			screen.getByRole("button", { name: "Program mentése" }),
		);

		expect(
			await screen.findByText(
				"A befejezés nem lehet korábbi a kezdésnél.",
			),
		).toBeInTheDocument();
		expect(screen.getByLabelText(/Befejezés/)).toHaveAttribute(
			"aria-invalid",
			"true",
		);
	});

	it("requires a capacity of at least 1", async () => {
		const user = userEvent.setup();
		render(<EventForm mode="create" />);
		await fillValid(user);
		await user.clear(screen.getByLabelText(/Max. tanulói létszám/));
		await user.type(screen.getByLabelText(/Max. tanulói létszám/), "0");
		await user.click(
			screen.getByRole("button", { name: "Program mentése" }),
		);
		expect(
			await screen.findByText("Legalább 1 fő legyen."),
		).toBeInTheDocument();
	});

	it("posts the event and opens it by the returned id", async () => {
		const user = userEvent.setup();
		apiFetch.mockResolvedValue({ id: "ev1" });
		render(<EventForm mode="create" />);
		await fillValid(user);
		await user.click(screen.getByRole("button", { name: "robotika" }));
		await user.type(screen.getByLabelText(/Mentorok/), "Szűcs Petra,");
		await user.click(
			screen.getByRole("button", { name: "Program mentése" }),
		);

		await waitFor(() => expect(push).toHaveBeenCalledWith("/events/ev1"));
		const [url, init] = apiFetch.mock.calls[0];
		expect(url).toBe("/api/events");
		expect(init.method).toBe("POST");
		expect(JSON.parse(init.body)).toEqual({
			name: "Python alapok",
			tags: ["robotika"],
			from: new Date("2027-03-06T10:00").toISOString(),
			to: new Date("2027-03-06T14:00").toISOString(),
			capacity: 24,
			mentors: ["Szűcs Petra"],
		});
		expect(toastSuccess).toHaveBeenCalled();
	});

	it("maps server field errors back onto the fields", async () => {
		const user = userEvent.setup();
		apiFetch.mockRejectedValue(
			new ApiError(400, {
				details: {
					fieldErrors: { name: ["Már létezik ilyen program."] },
				},
			}),
		);
		render(<EventForm mode="create" />);
		await fillValid(user);
		await user.click(
			screen.getByRole("button", { name: "Program mentése" }),
		);

		expect(
			await screen.findByText("Már létezik ilyen program."),
		).toBeInTheDocument();
		expect(push).not.toHaveBeenCalled();
	});

	describe("edit mode", () => {
		const event = {
			id: "ev1",
			name: "Python alapok",
			tags: ["robotika"],
			description: "Régi leírás",
			from: new Date("2027-03-06T10:00").toISOString(),
			to: new Date("2027-03-06T14:00").toISOString(),
			companyName: null,
			location: null,
			capacity: 24,
			ageRange: "12-18",
			sheetUrl: null,
			feedbackSheetUrl: null,
			instructor: null,
			mentors: ["Szűcs Petra"],
		};

		it("prefills the fields from the event", () => {
			render(<EventForm mode="edit" event={event} />);

			expect(
				screen.getByRole("heading", { name: "Program szerkesztése" }),
			).toBeInTheDocument();
			expect(screen.getByLabelText(/Program neve/)).toHaveValue(
				"Python alapok",
			);
			expect(screen.getByLabelText(/Kezdés/)).toHaveValue(
				"2027-03-06T10:00",
			);
			expect(screen.getByLabelText(/Max. tanulói létszám/)).toHaveValue(
				24,
			);
			expect(screen.getByLabelText(/Korosztály – tól/)).toHaveValue(12);
			expect(screen.getByLabelText(/Korosztály – ig/)).toHaveValue(18);
			expect(screen.getByText("Szűcs Petra")).toBeInTheDocument();
		});

		it("patches the event and sends null for cleared optional fields", async () => {
			const user = userEvent.setup();
			apiFetch.mockResolvedValue({ id: "ev1" });
			render(<EventForm mode="edit" event={event} />);
			await user.clear(screen.getByLabelText(/Rövid leírás/));
			await user.click(
				screen.getByRole("button", { name: "Változtatások mentése" }),
			);

			await waitFor(() =>
				expect(push).toHaveBeenCalledWith("/events/ev1"),
			);
			const [url, init] = apiFetch.mock.calls[0];
			expect(url).toBe("/api/events/ev1");
			expect(init.method).toBe("PATCH");
			expect(JSON.parse(init.body)).toEqual({
				name: "Python alapok",
				tags: ["robotika"],
				description: null,
				from: event.from,
				to: event.to,
				companyName: null,
				location: null,
				capacity: 24,
				ageRange: "12-18",
				sheetUrl: null,
				feedbackSheetUrl: null,
				instructor: null,
				mentors: ["Szűcs Petra"],
			});
		});

		it("toasts when the event no longer exists", async () => {
			const user = userEvent.setup();
			apiFetch.mockRejectedValue(new ApiError(404));
			render(<EventForm mode="edit" event={event} />);
			await user.click(
				screen.getByRole("button", { name: "Változtatások mentése" }),
			);

			await waitFor(() =>
				expect(toastError).toHaveBeenCalledWith(
					"A program már nem létezik.",
				),
			);
			expect(push).not.toHaveBeenCalled();
		});
	});

	it("toasts on unexpected failures and stays on the page", async () => {
		const user = userEvent.setup();
		apiFetch.mockRejectedValue(new ApiError(500));
		render(<EventForm mode="create" />);
		await fillValid(user);
		await user.click(
			screen.getByRole("button", { name: "Program mentése" }),
		);

		await waitFor(() => expect(toastError).toHaveBeenCalled());
		expect(push).not.toHaveBeenCalled();
		expect(
			screen.getByRole("button", { name: "Program mentése" }),
		).toBeEnabled();
	});
});
