// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { anonymizeApplicants, ApplicantsNotFoundError } from "./anonymize";

const tx = {
	applicant: { findMany: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
	application: { findMany: vi.fn(), updateMany: vi.fn() },
	history: { updateMany: vi.fn(), createMany: vi.fn() },
};
const db = {
	$transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
} as unknown as Parameters<typeof anonymizeApplicants>[0];

const now = new Date("2026-11-19T10:00:00Z");
const writes = () => [
	tx.applicant.updateMany,
	tx.application.updateMany,
	tx.history.updateMany,
	tx.history.createMany,
];

describe("anonymizeApplicants", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		tx.applicant.findMany.mockResolvedValue([
			{ id: "a1", deletedAt: null },
			{ id: "a2", deletedAt: null },
		]);
		tx.application.findMany.mockResolvedValue([
			{ id: "app1" },
			{ id: "app2" },
		]);
	});

	it("removes personal data and records who deleted when", async () => {
		const result = await anonymizeApplicants(db, ["a1", "a2"], "u1", now);
		expect(result).toEqual({ deleted: 2 });
		expect(db.$transaction).toHaveBeenCalledOnce();
		expect(tx.applicant.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["a1", "a2"] }, deletedAt: null },
			data: {
				firstName: "Törölt",
				lastName: "jelentkező",
				email: null,
				phoneNumber: null,
				schoolName: null,
				parentFirstName: null,
				parentLastName: null,
				parentMothersName: null,
				parentAddress: null,
				parentEmail: null,
				parentPhone: null,
				newsletter: false,
				duplicateKey: null,
				duplicateFlag: false,
				deletedAt: now,
				deletedById: "u1",
				updatedById: "u1",
			},
		});
	});

	it("keeps birth year, hometown and applications, but clears free text", async () => {
		await anonymizeApplicants(db, ["a1", "a2"], "u1", now);
		const applicantData = tx.applicant.updateMany.mock.calls[0][0].data;
		expect(applicantData).not.toHaveProperty("birthYear");
		expect(applicantData).not.toHaveProperty("hometown");

		expect(tx.application.findMany).toHaveBeenCalledWith({
			where: { applicantId: { in: ["a1", "a2"] } },
			select: { id: true },
		});
		expect(tx.application.updateMany).toHaveBeenCalledWith({
			where: { id: { in: ["app1", "app2"] } },
			data: {
				foodPreference: null,
				heardFromWhere: null,
				heardFromWhom: null,
				solvedProblem: null,
				pastExpInProg: null,
				pastParticipationOther: null,
				pastParticipationSkoolDesc: null,
				comment: null,
				updatedById: "u1",
			},
		});
	});

	it("scrubs history values for the applicants and their applications", async () => {
		await anonymizeApplicants(db, ["a1", "a2"], "u1", now);
		expect(tx.history.updateMany).toHaveBeenCalledWith({
			where: {
				OR: [
					{ tableName: "applicant", recordId: { in: ["a1", "a2"] } },
					{
						tableName: "application",
						recordId: { in: ["app1", "app2"] },
					},
				],
			},
			data: { oldValue: null, newValue: null },
		});
		expect(tx.history.createMany).toHaveBeenCalledWith({
			data: ["a1", "a2"].map((recordId) => ({
				tableName: "applicant",
				fieldName: "deletedAt",
				recordId,
				oldValue: null,
				newValue: null,
				createdById: "u1",
				createdAt: now,
			})),
		});
	});

	it("only scrubs applicant history when there are no applications", async () => {
		tx.application.findMany.mockResolvedValue([]);
		await anonymizeApplicants(db, ["a1", "a2"], "u1", now);
		expect(tx.application.updateMany).not.toHaveBeenCalled();
		expect(tx.history.updateMany.mock.calls[0][0].where.OR).toEqual([
			{ tableName: "applicant", recordId: { in: ["a1", "a2"] } },
		]);
	});

	it("clears the duplicate key and recomputes the flag of the remaining twins", async () => {
		tx.applicant.findMany.mockResolvedValue([
			{ id: "a1", deletedAt: null, duplicateKey: "nagy|luca|l@x.hu" },
			{ id: "a2", deletedAt: null, duplicateKey: null },
		]);
		tx.applicant.count.mockResolvedValue(1);
		await anonymizeApplicants(db, ["a1", "a2"], "u1", now);
		expect(tx.applicant.count).toHaveBeenCalledOnce();
		expect(tx.applicant.count).toHaveBeenCalledWith({
			where: { duplicateKey: "nagy|luca|l@x.hu", deletedAt: null },
		});
		expect(tx.applicant.updateMany).toHaveBeenLastCalledWith({
			where: {
				duplicateKey: "nagy|luca|l@x.hu",
				deletedAt: null,
				duplicateFlag: true,
			},
			data: { duplicateFlag: false },
		});
	});

	it("skips already deleted applicants without failing", async () => {
		tx.applicant.findMany.mockResolvedValue([
			{ id: "a1", deletedAt: new Date("2026-01-01") },
			{ id: "a2", deletedAt: null },
		]);
		const result = await anonymizeApplicants(db, ["a1", "a2"], "u1", now);
		expect(result).toEqual({ deleted: 1 });
		expect(tx.applicant.updateMany.mock.calls[0][0].where).toEqual({
			id: { in: ["a2"] },
			deletedAt: null,
		});
	});

	it("does nothing when every applicant is already deleted", async () => {
		tx.applicant.findMany.mockResolvedValue([
			{ id: "a1", deletedAt: new Date("2026-01-01") },
		]);
		expect(await anonymizeApplicants(db, ["a1"], "u1", now)).toEqual({
			deleted: 0,
		});
		for (const write of writes()) expect(write).not.toHaveBeenCalled();
	});

	it("throws NotFound and writes nothing when an id is unknown", async () => {
		tx.applicant.findMany.mockResolvedValue([
			{ id: "a1", deletedAt: null },
		]);
		await expect(
			anonymizeApplicants(db, ["a1", "missing"], "u1", now),
		).rejects.toBeInstanceOf(ApplicantsNotFoundError);
		for (const write of writes()) expect(write).not.toHaveBeenCalled();
	});

	it("treats duplicate ids as one applicant", async () => {
		tx.applicant.findMany.mockResolvedValue([
			{ id: "a1", deletedAt: null },
		]);
		expect(await anonymizeApplicants(db, ["a1", "a1"], "u1", now)).toEqual({
			deleted: 1,
		});
	});
});
