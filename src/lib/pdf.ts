import "server-only";
import puppeteer, { type PDFOptions } from "puppeteer";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export type PdfOptions = Pick<
	PDFOptions,
	"format" | "landscape" | "margin" | "printBackground"
>;

export interface PdfService {
	renderHtml(html: string, options?: PdfOptions): Promise<Uint8Array>;
}

export const pdfService: PdfService = {
	async renderHtml(html, options = {}) {
		try {
			const browser = await puppeteer.launch({
				headless: true,
				executablePath: env.PUPPETEER_EXECUTABLE_PATH,
			});
			try {
				const page = await browser.newPage();
				await page.setJavaScriptEnabled(false);
				await page.setRequestInterception(true);
				page.on("request", (request) => {
					// Templates are self-contained: disallow network and local-file access.
					const protocol = new URL(request.url()).protocol;
					void (protocol === "data:" || protocol === "about:"
						? request.continue()
						: request.abort());
				});
				page.setDefaultTimeout(30_000);
				await page.setContent(html, {
					waitUntil: "load",
					timeout: 30_000,
				});
				return await page.pdf({
					format: "A4",
					printBackground: true,
					timeout: 30_000,
					...options,
				});
			} finally {
				await browser.close();
			}
		} catch (error) {
			logger.error({ err: error }, "PDF generation failed");
			throw error;
		}
	},
};
