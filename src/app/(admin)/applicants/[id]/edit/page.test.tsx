import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdmin, getApplicantForEdit, notFound } = vi.hoisted(() => ({
	requireAdmin: vi.fn(),
	getApplicantForEdit: vi.fn(),
	notFound: vi.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
}));
vi.mock("@/lib/session", () => ({ requireAdmin }));
vi.mock("@/lib/applicants/detail", () => ({ getApplicantForEdit }));
vi.mock("next/navigation", () => ({
	notFound,
	useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

import ApplicantEditPage, { generateMetadata } from "./page";

const props = (id = "a1") => ({ params: Promise.resolve({ id }) });

const applicant = {
	id: "a1",
	updatedAt: new Date("2026-11-19T10:00:00.000Z"),
	lastName: "Nagy",
	firstName: "Luca",
	birthYear: 2010,
	email: "nagy.luca@gmail.com",
	phoneNumber: null,
	schoolName: null,
	hometown: "Budapest",
	parentLastName: null,
	parentFirstName: null,
	parentMothersName: null,
	parentAddress: null,
	parentEmail: null,
	parentPhone: null,
	newsletter: false,
};

describe("applicant edit page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireAdmin.mockResolvedValue({ user: { id: "u1" } });
	});

	it("checks the session before reading data", async () => {
		requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
		await expect(ApplicantEditPage(props())).rejects.toThrow(
			"NEXT_REDIRECT",
		);
		expect(requireAdmin).toHaveBeenCalledWith("/applicants/a1/edit");
		expect(getApplicantForEdit).not.toHaveBeenCalled();
	});

	it("shows the not-found page for unknown or deleted applicants", async () => {
		getApplicantForEdit.mockResolvedValue(null);
		await expect(ApplicantEditPage(props("gone"))).rejects.toThrow(
			"NEXT_NOT_FOUND",
		);
	});

	it("renders the pre-filled form with the breadcrumb", async () => {
		getApplicantForEdit.mockResolvedValue(applicant);
		render(await ApplicantEditPage(props()));
		expect(
			screen.getByRole("heading", {
				level: 1,
				name: "Adatlap szerkesztése",
			}),
		).toBeInTheDocument();
		expect(
			screen.getByRole("navigation", { name: "Morzsamenü" }),
		).toHaveTextContent(/Jelentkezők.*Nagy Luca.*Szerkesztés/);
		expect(screen.getByLabelText(/^Település/)).toHaveValue("Budapest");
		expect(screen.getByLabelText(/^Telefon/)).toHaveValue("");
	});

	it("sets the page title", async () => {
		getApplicantForEdit.mockResolvedValue(applicant);
		expect(await generateMetadata(props())).toEqual({
			title: "Szerkesztés · Nagy Luca",
		});
	});
});
