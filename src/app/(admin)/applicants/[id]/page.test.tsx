import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { detailApplicant } from "@/components/applicants/detail/test-fixtures";

const { requireAdmin, getApplicantDetail, notFound } = vi.hoisted(() => ({
	requireAdmin: vi.fn(),
	getApplicantDetail: vi.fn(),
	notFound: vi.fn(() => {
		throw new Error("NEXT_NOT_FOUND");
	}),
}));
vi.mock("@/lib/session", () => ({ requireAdmin }));
vi.mock("@/lib/applicants/detail", () => ({ getApplicantDetail }));
vi.mock("next/navigation", () => ({
	notFound,
	useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
}));

import ApplicantDetailPage, { generateMetadata } from "./page";

const props = (id = "a1") => ({ params: Promise.resolve({ id }) });

describe("applicant detail page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireAdmin.mockResolvedValue({ user: { id: "u1" } });
	});

	it("checks the session before reading data and never reads without one", async () => {
		requireAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));
		await expect(ApplicantDetailPage(props("a1"))).rejects.toThrow(
			"NEXT_REDIRECT",
		);
		expect(requireAdmin).toHaveBeenCalledWith("/applicants/a1");
		expect(getApplicantDetail).not.toHaveBeenCalled();
	});

	it("shows the not-found page for unknown or deleted applicants", async () => {
		getApplicantDetail.mockResolvedValue(null);
		await expect(ApplicantDetailPage(props("gone"))).rejects.toThrow(
			"NEXT_NOT_FOUND",
		);
		expect(notFound).toHaveBeenCalled();
	});

	it("renders the heading and breadcrumb of an existing applicant", async () => {
		getApplicantDetail.mockResolvedValue(detailApplicant());
		render(await ApplicantDetailPage(props("a1")));
		expect(
			screen.getByRole("heading", { level: 1, name: "Nagy Luca" }),
		).toBeInTheDocument();
		const crumb = screen.getByRole("navigation", { name: "Morzsamenü" });
		expect(crumb).toHaveTextContent("Jelentkezők›Nagy Luca");
		expect(
			screen.getByRole("link", { name: "Jelentkezők" }),
		).toHaveAttribute("href", "/applicants");
		expect(
			screen.getByRole("heading", { name: "Programok" }),
		).toBeInTheDocument();
	});

	it("uses the applicant's name as the page title", async () => {
		getApplicantDetail.mockResolvedValue(detailApplicant());
		expect(await generateMetadata(props("a1"))).toEqual({
			title: "Nagy Luca",
		});
	});
});
