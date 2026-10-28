// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	launch: vi.fn(),
	close: vi.fn(),
	newPage: vi.fn(),
	setJavaScriptEnabled: vi.fn(),
	setRequestInterception: vi.fn(),
	on: vi.fn(),
	setDefaultTimeout: vi.fn(),
	setContent: vi.fn(),
	pdf: vi.fn(),
	logError: vi.fn(),
}));
vi.mock("puppeteer", () => ({ default: { launch: mocks.launch } }));
vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("@/lib/logger", () => ({ logger: { error: mocks.logError } }));

import { pdfService } from "./pdf";

describe("PDF service", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mocks.launch.mockResolvedValue({
			newPage: mocks.newPage,
			close: mocks.close,
		});
		mocks.newPage.mockResolvedValue(mocks);
		mocks.pdf.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
	});

	it("creates a PDF with isolated, self-contained content and closes Chromium", async () => {
		const pdf = await pdfService.renderHtml("<h1>Test</h1>", {
			landscape: true,
		});
		expect(Buffer.from(pdf).toString()).toBe("%PDF");
		expect(mocks.setJavaScriptEnabled).toHaveBeenCalledWith(false);
		expect(mocks.pdf).toHaveBeenCalledWith(
			expect.objectContaining({ landscape: true, format: "A4" }),
		);
		expect(mocks.close).toHaveBeenCalledOnce();

		const handler = mocks.on.mock.calls[0][1];
		for (const url of ["https://example.test", "file:///etc/hosts"]) {
			const request = {
				url: () => url,
				abort: vi.fn(),
				continue: vi.fn(),
			};
			handler(request);
			expect(request.abort).toHaveBeenCalledOnce();
		}
		const embedded = {
			url: () => "data:image/png;base64,abc",
			abort: vi.fn(),
			continue: vi.fn(),
		};
		handler(embedded);
		expect(embedded.continue).toHaveBeenCalledOnce();
	});

	it("logs failures, propagates them, and closes Chromium", async () => {
		const error = new Error("Rendering failed");
		mocks.setContent.mockRejectedValue(error);
		await expect(pdfService.renderHtml("<p>Test</p>")).rejects.toThrow(
			error,
		);
		expect(mocks.close).toHaveBeenCalledOnce();
		expect(mocks.logError).toHaveBeenCalledWith(
			{ err: error },
			"PDF generation failed",
		);
	});
});
