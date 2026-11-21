// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./token", () => {
	class GoogleReauthRequiredError extends Error {}
	return { GoogleReauthRequiredError };
});

import { fetchSheet, SheetAccessError } from "./sheets";
import { GoogleReauthRequiredError } from "./token";

const META = {
	properties: { timeZone: "Europe/Budapest" },
	sheets: [
		{ properties: { sheetId: 0, title: "Form Responses 1" } },
		{ properties: { sheetId: 42, title: "Anna's tab" } },
	],
};

/** Answers the metadata call with `meta` and the values call with `values`. */
function mockGoogle(meta: { status: number; body: unknown }, values?: unknown) {
	return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
		String(input).includes("/values/")
			? new Response(JSON.stringify(values), { status: 200 })
			: new Response(JSON.stringify(meta.body), {
					status: meta.status,
				}),
	);
}

describe("fetchSheet", () => {
	afterEach(() => vi.restoreAllMocks());

	it("reads the first worksheet when the link has no gid", async () => {
		const fetch = mockGoogle(
			{ status: 200, body: META },
			{ values: [["Időbélyeg"], [45000]] },
		);
		await expect(
			fetchSheet({ spreadsheetId: "abc", gid: null }, "token"),
		).resolves.toEqual({
			timeZone: "Europe/Budapest",
			rows: [["Időbélyeg"], [45000]],
		});
		const valuesUrl = String(fetch.mock.calls[1][0]);
		expect(valuesUrl).toContain(
			`/abc/values/${encodeURIComponent("'Form Responses 1'")}?`,
		);
		expect(fetch.mock.calls[0][1]).toMatchObject({
			headers: { Authorization: "Bearer token" },
		});
	});

	it("reads the worksheet given by the gid (header row only)", async () => {
		const fetch = mockGoogle({ status: 200, body: META }, {});
		await expect(
			fetchSheet({ spreadsheetId: "abc", gid: 42 }, "token", {
				headerOnly: true,
			}),
		).resolves.toEqual({ timeZone: "Europe/Budapest", rows: [] });
		expect(String(fetch.mock.calls[1][0])).toContain(
			`/values/${encodeURIComponent("'Anna''s tab'!1:1")}?`,
		);
	});

	it("reports an unknown gid as an inaccessible worksheet", async () => {
		const fetch = mockGoogle({ status: 200, body: META });
		const error = await fetchSheet(
			{ spreadsheetId: "abc", gid: 7 },
			"token",
		).catch((e: unknown) => e);
		expect(error).toBeInstanceOf(SheetAccessError);
		expect((error as Error).message).toBe(
			"A megadott munkalap nem található.",
		);
		expect(fetch).toHaveBeenCalledTimes(1);
	});

	it.each([403, 404])(
		"reports a spreadsheet Google answers %i for as not accessible",
		async (status) => {
			mockGoogle({ status, body: {} });
			const error = await fetchSheet(
				{ spreadsheetId: "abc", gid: null },
				"token",
			).catch((e: unknown) => e);
			expect(error).toBeInstanceOf(SheetAccessError);
			expect((error as Error).message).toBe(
				"A sheet nem található, vagy nincs hozzá hozzáférésed.",
			);
		},
	);

	it("asks to sign in again when Google rejects the token", async () => {
		mockGoogle({ status: 401, body: {} });
		await expect(
			fetchSheet({ spreadsheetId: "abc", gid: null }, "token"),
		).rejects.toBeInstanceOf(GoogleReauthRequiredError);
	});
});
