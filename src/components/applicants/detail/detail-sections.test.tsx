import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ApplicantDetailHeader } from "./applicant-detail-header";
import { ParentDataCard, PersonalDataCard } from "./data-cards";
import { FormAnswersCard } from "./form-answers-card";
import { HistoryCard } from "./history-card";
import { ProgramsTable } from "./programs-table";
import { TagsCard } from "./tags-card";
import { detailApplicant, detailApplication, NOW } from "./test-fixtures";

describe("ApplicantDetailHeader", () => {
	it("shows status, 16+, newsletter and alumni badges (spec: alumni applicant)", () => {
		render(
			<ApplicantDetailHeader applicant={detailApplicant()} now={NOW} />,
		);
		expect(
			screen.getByRole("heading", { level: 1, name: "Nagy Luca" }),
		).toBeInTheDocument();
		const badges = within(
			screen.getByRole("list", { name: "Státusz és címkék" }),
		)
			.getAllByRole("listitem")
			.map((li) => li.textContent);
		expect(badges).toEqual(["Elfogadva", "16+", "Hírlevél", "Alumni"]);
		expect(
			screen.getByText(
				/Létrehozva 2026\.10\.02 18:41 · Módosítva 2026\.10\.05 14:30/,
			),
		).toBeInTheDocument();
	});

	it("shows no badges without applications, birth year or newsletter", () => {
		render(
			<ApplicantDetailHeader
				applicant={detailApplicant({
					applications: [],
					birthYear: null,
					newsletter: false,
				})}
				now={NOW}
			/>,
		);
		expect(
			within(
				screen.getByRole("list", { name: "Státusz és címkék" }),
			).queryAllByRole("listitem"),
		).toHaveLength(0);
	});
});

describe("data cards", () => {
	it("lists personal data with links and age", () => {
		render(<PersonalDataCard applicant={detailApplicant()} now={NOW} />);
		expect(screen.getByText("2010 · 16 év")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "nagy.luca@example.com" }),
		).toHaveAttribute("href", "mailto:nagy.luca@example.com");
		expect(
			screen.getByRole("link", { name: "+36 30 555 1234" }),
		).toHaveAttribute("href", "tel:+36305551234");
	});

	it("shows dashes for missing parent data", () => {
		render(
			<ParentDataCard
				applicant={detailApplicant({
					parentFirstName: null,
					parentLastName: null,
					parentMothersName: null,
					parentAddress: null,
					parentEmail: null,
					parentPhone: null,
				})}
			/>,
		);
		const values = screen
			.getAllByRole("definition")
			.map((dd) => dd.textContent);
		expect(values).toEqual(["—", "—", "—", "—", "—"]);
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
	});
});

describe("ProgramsTable", () => {
	it("summarises applications and lists each one", () => {
		render(
			<ProgramsTable
				applications={[
					detailApplication(),
					detailApplication({ id: "b", status: "ATTENDED" }),
					detailApplication({ id: "c", status: "ATTENDED" }),
				]}
			/>,
		);
		expect(
			screen.getByText("3 jelentkezés · 2 elvégzett"),
		).toBeInTheDocument();
		expect(screen.getAllByRole("row")).toHaveLength(4);
		expect(
			screen.getAllByText("2026.11.21 – 2026.12.12").length,
		).toBeGreaterThan(0);
	});

	it("shows an empty state without applications", () => {
		render(<ProgramsTable applications={[]} />);
		expect(screen.getByText("Még nincs jelentkezése")).toBeInTheDocument();
		expect(screen.queryByRole("table")).not.toBeInTheDocument();
	});
});

describe("FormAnswersCard", () => {
	it("lists only answered questions (spec scenario)", () => {
		render(
			<FormAnswersCard
				application={detailApplication({
					heardFromWhere: "Korábbi Skool program",
					comment: "Laptopot hozok",
					heardFromWhom: "   ",
				})}
			/>,
		);
		expect(
			screen.getByText("Python alapok – ősz · beküldve 2026.10.02 18:41"),
		).toBeInTheDocument();
		expect(screen.getAllByRole("term").map((dt) => dt.textContent)).toEqual(
			["Honnan hallottál rólunk?", "Megjegyzés"],
		);
	});

	it("shows past Skool participation only when yes", () => {
		render(
			<FormAnswersCard
				application={detailApplication({
					pastParticipationSkool: true,
				})}
			/>,
		);
		expect(
			screen.getByText("Részt vettél már Skool programon?"),
		).toBeInTheDocument();
		expect(screen.getByText("Igen")).toBeInTheDocument();
	});

	it("says when nothing was answered", () => {
		render(<FormAnswersCard application={detailApplication()} />);
		expect(screen.getByText("Nincs kitöltött válasz")).toBeInTheDocument();
	});

	it("is not shown without applications", () => {
		const { container } = render(<FormAnswersCard application={null} />);
		expect(container).toBeEmptyDOMElement();
	});
});

describe("TagsCard", () => {
	it("shows the automatic 16+ tag", () => {
		render(
			<TagsCard
				applicant={detailApplicant({
					birthYear: 2009,
					newsletter: false,
					applications: [],
				})}
				now={NOW}
			/>,
		);
		expect(screen.getByText("16+ · automatikus")).toBeInTheDocument();
		expect(screen.queryByText("Hírlevél")).not.toBeInTheDocument();
	});

	it("says when there is no tag", () => {
		render(
			<TagsCard
				applicant={detailApplicant({
					birthYear: 2015,
					newsletter: false,
					applications: [],
				})}
				now={NOW}
			/>,
		);
		expect(screen.getByText("Nincs címke")).toBeInTheDocument();
	});
});

describe("HistoryCard", () => {
	it("shows a status change of an application (spec scenario)", () => {
		render(
			<HistoryCard
				applicantId="a1"
				entries={[
					{
						id: "h1",
						actor: "Kovács Anna",
						field: "status",
						programName: "Python alapok – ősz",
						oldValue: "APPLIED",
						newValue: "ACCEPTED",
						createdAt: new Date("2026-11-19T09:12:00Z"),
					},
				]}
			/>,
		);
		const item = screen.getByRole("listitem");
		expect(item).toHaveTextContent(
			"Kovács Anna módosította: Státusz (Python alapok – ősz)",
		);
		expect(item).toHaveTextContent("Új jelentkező → Elfogadva");
		expect(item).toHaveTextContent("2026.11.19 10:12");
	});

	it("attributes changes without a user to Rendszer and skips empty values", () => {
		render(
			<HistoryCard
				applicantId="a1"
				entries={[
					{
						id: "h2",
						actor: null,
						field: "customField",
						programName: null,
						oldValue: null,
						newValue: null,
						createdAt: new Date("2026-11-19T09:12:00Z"),
					},
				]}
			/>,
		);
		const item = screen.getByRole("listitem");
		expect(item).toHaveTextContent("Rendszer módosította: customField");
		expect(item).not.toHaveTextContent("→");
	});

	it("links to the full history page", () => {
		render(<HistoryCard applicantId="a 1" entries={[]} />);
		expect(
			screen.getByRole("heading", { name: "Legutóbbi változások" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "Teljes napló" }),
		).toHaveAttribute("href", "/history/a%201");
	});

	it("says when there are no changes", () => {
		render(<HistoryCard applicantId="a1" entries={[]} />);
		expect(
			screen.getByText("Még nincs rögzített változás"),
		).toBeInTheDocument();
	});
});

describe("ProgramsTable on mobile (04.1 M)", () => {
	it("shows a list with one row per application and keeps the table for md+", () => {
		render(
			<ProgramsTable
				applications={[
					detailApplication(),
					detailApplication({ id: "b", status: "ATTENDED" }),
					detailApplication({ id: "c", status: "WAITLISTED" }),
				]}
			/>,
		);
		const list = screen.getByRole("list", { name: "Programok" });
		expect(list).toHaveClass("md:hidden");
		const rows = within(list).getAllByRole("listitem");
		expect(rows).toHaveLength(3);
		expect(rows[0]).toHaveTextContent("Python alapok – ősz");
		expect(rows[0]).toHaveTextContent("2026.11.21 – 2026.12.12");
		expect(rows[0]).toHaveTextContent("Elfogadva");
		expect(screen.getByTestId("programs-table-frame")).toHaveClass(
			"hidden",
			"md:block",
		);
	});
});

describe("KeyValueList on mobile", () => {
	it("uses one column with dividers, two columns from md", () => {
		render(<ParentDataCard applicant={detailApplicant()} />);
		const dl = screen.getAllByRole("term")[0].closest("dl");
		expect(dl).toHaveClass("grid-cols-1", "divide-y", "md:grid-cols-2");
	});
});
