// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
	const tx = {
		eventReportDocument: { create: vi.fn() },
		history: { create: vi.fn() },
	};
	return {
		tx,
		findEvent: vi.fn(),
		upsertReport: vi.fn(),
		transaction: vi.fn(),
		getToken: vi.fn(),
		copyDriveFile: vi.fn(),
		getDocument: vi.fn(),
		batchUpdateDocument: vi.fn(),
		getEventReport: vi.fn(),
		toDocumentData: vi.fn(),
	};
});
vi.mock("@/lib/env", () => ({
	env: { REPORT_TEMPLATE_DOC_ID: "template-123" },
}));
vi.mock("@/lib/db", () => ({
	db: {
		event: { findUnique: mocks.findEvent },
		eventReport: { upsert: mocks.upsertReport },
		$transaction: mocks.transaction,
	},
}));
vi.mock("@/lib/google/token", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/google/token")>()),
	getGoogleAccessToken: mocks.getToken,
}));
vi.mock("@/lib/google/docs", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/google/docs")>()),
	copyDriveFile: mocks.copyDriveFile,
	getDocument: mocks.getDocument,
	batchUpdateDocument: mocks.batchUpdateDocument,
}));
vi.mock("./load", () => ({
	getEventReport: mocks.getEventReport,
	toDocumentData: mocks.toDocumentData,
}));
vi.mock("./format", () => ({ reportFileName: () => "Riport – Tábor" }));
vi.mock("./template", () => ({
	findTemplateRow: () => null,
	personRowFillRequests: () => [],
	personRowStructureRequests: () => [],
	replaceRequests: () => [],
	templateValues: () => ({}),
}));

import { ReportTemplateNotAccessibleError } from "@/lib/google/docs";
import {
	GOOGLE_DRIVE_FILE_SCOPE,
	GOOGLE_DRIVE_READONLY_SCOPE,
	GoogleReauthRequiredError,
} from "@/lib/google/token";
import {
	generateReportDocument,
	REPORT_DOCUMENT_HISTORY_FIELD,
	ReportEventNotFoundError,
} from "./save";

const content = { people: [], quotes: [], disabledMetrics: [] };
const created = {
	id: "d1",
	title: "Riport – Tábor",
	docUrl: "https://docs.google.com/document/d/doc-1/edit",
	createdAt: new Date("2026-11-20T10:00:00Z"),
};

describe("generateReportDocument", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mocks.findEvent.mockResolvedValue({ id: "e1" });
		mocks.upsertReport.mockResolvedValue({});
		mocks.getEventReport.mockResolvedValue({ event: { id: "e1" } });
		mocks.toDocumentData.mockReturnValue({ people: [] });
		mocks.getToken.mockResolvedValue("token");
		mocks.copyDriveFile.mockResolvedValue({
			id: "doc-1",
			url: created.docUrl,
		});
		mocks.getDocument.mockResolvedValue({});
		mocks.batchUpdateDocument.mockResolvedValue(undefined);
		mocks.transaction.mockImplementation((fn) => fn(mocks.tx));
		mocks.tx.eventReportDocument.create.mockResolvedValue(created);
	});

	it("saves the content, copies the template with both Drive scopes and records the doc", async () => {
		const result = await generateReportDocument("e1", content, "u1");

		expect(result).toEqual(created);
		expect(mocks.upsertReport).toHaveBeenCalledWith(
			expect.objectContaining({ where: { eventId: "e1" } }),
		);
		expect(mocks.upsertReport.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.copyDriveFile.mock.invocationCallOrder[0],
		);
		expect(mocks.getToken).toHaveBeenCalledWith("u1", [
			GOOGLE_DRIVE_FILE_SCOPE,
			GOOGLE_DRIVE_READONLY_SCOPE,
		]);
		expect(mocks.copyDriveFile).toHaveBeenCalledWith(
			"template-123",
			"Riport – Tábor",
			"token",
		);
		expect(mocks.batchUpdateDocument).toHaveBeenCalledWith(
			"doc-1",
			expect.any(Array),
			"token",
		);
		expect(mocks.tx.eventReportDocument.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: {
					eventId: "e1",
					docId: "doc-1",
					docUrl: created.docUrl,
					title: "Riport – Tábor",
					createdById: "u1",
				},
			}),
		);
		expect(mocks.tx.history.create).toHaveBeenCalledWith({
			data: {
				tableName: "event",
				recordId: "e1",
				fieldName: REPORT_DOCUMENT_HISTORY_FIELD,
				oldValue: null,
				newValue: "Riport – Tábor",
				createdById: "u1",
			},
		});
	});

	it("creates a new doc on every run", async () => {
		await generateReportDocument("e1", content, "u1");
		await generateReportDocument("e1", content, "u1");
		expect(mocks.copyDriveFile).toHaveBeenCalledTimes(2);
		expect(mocks.tx.eventReportDocument.create).toHaveBeenCalledTimes(2);
	});

	it("throws for an unknown event and creates no doc", async () => {
		mocks.findEvent.mockResolvedValue(null);
		await expect(
			generateReportDocument("missing", content, "u1"),
		).rejects.toBeInstanceOf(ReportEventNotFoundError);
		expect(mocks.copyDriveFile).not.toHaveBeenCalled();
		expect(mocks.transaction).not.toHaveBeenCalled();
	});

	it.each([
		["a missing Drive scope", new GoogleReauthRequiredError(), "getToken"],
		[
			"an inaccessible template",
			new ReportTemplateNotAccessibleError(),
			"copyDriveFile",
		],
	] as const)("records nothing on %s", async (_label, error, failing) => {
		mocks[failing].mockRejectedValue(error);
		await expect(generateReportDocument("e1", content, "u1")).rejects.toBe(
			error,
		);
		expect(mocks.transaction).not.toHaveBeenCalled();
		expect(mocks.tx.eventReportDocument.create).not.toHaveBeenCalled();
		expect(mocks.tx.history.create).not.toHaveBeenCalled();
	});
});
