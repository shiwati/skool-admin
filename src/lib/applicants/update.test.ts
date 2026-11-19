// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicantUpdate } from "./edit-schema";
import {
	ApplicantConflictError,
	ApplicantNotFoundError,
	diffApplicant,
	updateApplicant,
} from "./update";

const data: ApplicantUpdate = {
	lastName: "Nagy",
	firstName: "Luca",
	birthYear: 2010,
	email: "nagy.luca@gmail.com",
	phoneNumber: "+36 30 555 1243",
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

describe("diffApplicant", () => {
	it("returns nothing when unchanged", () => {
		expect(diffApplicant(data, { ...data })).toEqual([]);
	});

	it("lists changed fields with stringified values", () => {
		expect(
			diffApplicant(data, {
				...data,
				phoneNumber: "+36 30 555 1234",
				schoolName: "Fazekas",
				newsletter: true,
				birthYear: 2011,
			}),
		).toEqual([
			{ field: "birthYear", oldValue: "2010", newValue: "2011" },
			{
				field: "phoneNumber",
				oldValue: "+36 30 555 1243",
				newValue: "+36 30 555 1234",
			},
			{ field: "schoolName", oldValue: null, newValue: "Fazekas" },
			{ field: "newsletter", oldValue: "false", newValue: "true" },
		]);
	});
});

describe("updateApplicant", () => {
	const loadedAt = new Date("2026-11-19T10:00:00.000Z");
	const savedAt = new Date("2026-11-19T10:05:00.000Z");
	const tx = {
		applicant: {
			findFirst: vi.fn(),
			updateMany: vi.fn(),
			count: vi.fn(),
			findUniqueOrThrow: vi.fn(),
		},
		history: { createMany: vi.fn() },
	};
	const db = {
		$transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
	} as unknown as Parameters<typeof updateApplicant>[0];
	const writes = () => [tx.applicant.updateMany, tx.history.createMany];

	beforeEach(() => {
		vi.clearAllMocks();
		tx.applicant.findFirst.mockResolvedValue({
			...data,
			duplicateKey: "nagy|luca|nagy.luca@gmail.com",
			updatedAt: loadedAt,
		});
		tx.applicant.updateMany.mockResolvedValue({ count: 1 });
		tx.applicant.findUniqueOrThrow.mockResolvedValue({
			updatedAt: savedAt,
		});
	});

	it("throws NotFound for unknown or deleted applicants without writing", async () => {
		tx.applicant.findFirst.mockResolvedValue(null);
		await expect(
			updateApplicant(db, "a1", data, loadedAt, "u1"),
		).rejects.toBeInstanceOf(ApplicantNotFoundError);
		expect(tx.applicant.findFirst.mock.calls[0][0].where).toEqual({
			id: "a1",
			deletedAt: null,
		});
		for (const w of writes()) expect(w).not.toHaveBeenCalled();
	});

	it("throws Conflict when the applicant changed since loading", async () => {
		await expect(
			updateApplicant(
				db,
				"a1",
				{ ...data, hometown: "Pécs" },
				new Date("2026-11-19T09:00:00.000Z"),
				"u1",
			),
		).rejects.toBeInstanceOf(ApplicantConflictError);
		for (const w of writes()) expect(w).not.toHaveBeenCalled();
	});

	it("throws Conflict when the compare-and-set update matches nothing", async () => {
		tx.applicant.updateMany.mockResolvedValue({ count: 0 });
		await expect(
			updateApplicant(
				db,
				"a1",
				{ ...data, hometown: "Pécs" },
				loadedAt,
				"u1",
			),
		).rejects.toBeInstanceOf(ApplicantConflictError);
		expect(tx.applicant.updateMany.mock.calls[0][0].where).toEqual({
			id: "a1",
			deletedAt: null,
			updatedAt: loadedAt,
		});
		expect(tx.history.createMany).not.toHaveBeenCalled();
	});

	it("writes nothing for an unchanged save", async () => {
		expect(await updateApplicant(db, "a1", data, loadedAt, "u1")).toEqual({
			updatedAt: loadedAt,
			changed: 0,
		});
		for (const w of writes()) expect(w).not.toHaveBeenCalled();
	});

	it("updates only changed fields and logs one history row (spec scenario)", async () => {
		const result = await updateApplicant(
			db,
			"a1",
			{ ...data, phoneNumber: "+36 30 555 1234" },
			loadedAt,
			"u1",
		);
		expect(result).toEqual({ updatedAt: savedAt, changed: 1 });
		expect(tx.applicant.updateMany).toHaveBeenCalledOnce();
		expect(tx.applicant.updateMany.mock.calls[0][0].data).toEqual({
			phoneNumber: "+36 30 555 1234",
			updatedById: "u1",
		});
		expect(tx.history.createMany).toHaveBeenCalledWith({
			data: [
				{
					tableName: "applicant",
					fieldName: "phoneNumber",
					recordId: "a1",
					oldValue: "+36 30 555 1243",
					newValue: "+36 30 555 1234",
					createdById: "u1",
				},
			],
		});
		expect(tx.applicant.count).not.toHaveBeenCalled();
	});

	it("recomputes the duplicate key and the flags of both keys on e-mail change", async () => {
		tx.applicant.count.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
		await updateApplicant(
			db,
			"a1",
			{ ...data, email: "Luca.Nagy@Gmail.com" },
			loadedAt,
			"u1",
		);
		const [first, ...rest] = tx.applicant.updateMany.mock.calls.map(
			(c) => c[0],
		);
		expect(first.data.duplicateKey).toBe("nagy|luca|luca.nagy@gmail.com");
		expect(tx.applicant.count.mock.calls.map((c) => c[0])).toEqual([
			{
				where: {
					duplicateKey: "nagy|luca|nagy.luca@gmail.com",
					deletedAt: null,
				},
			},
			{
				where: {
					duplicateKey: "nagy|luca|luca.nagy@gmail.com",
					deletedAt: null,
				},
			},
		]);
		expect(rest).toEqual([
			{
				where: {
					duplicateKey: "nagy|luca|nagy.luca@gmail.com",
					duplicateFlag: true,
				},
				data: { duplicateFlag: false },
			},
			{
				where: {
					duplicateKey: "nagy|luca|luca.nagy@gmail.com",
					duplicateFlag: false,
				},
				data: { duplicateFlag: true },
			},
		]);
	});
});
