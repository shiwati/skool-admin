import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicants } from "./use-applicants";

const page = (total: number) => ({ items: [], total, page: 1, pageSize: 25 });
const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	});

describe("useApplicants", () => {
	const fetchMock = vi.fn();
	const location = { pathname: "/applicants", search: "?page=2", href: "" };

	beforeEach(() => {
		location.href = "";
		vi.stubGlobal("fetch", fetchMock);
		vi.stubGlobal("location", location);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.resetAllMocks();
	});

	it("loads the page for the given query", async () => {
		fetchMock.mockResolvedValue(json(page(3)));
		const { result } = renderHook(() =>
			useApplicants("page=1&pageSize=25"),
		);
		expect(result.current.status).toBe("loading");
		await waitFor(() => expect(result.current.status).toBe("success"));
		expect(result.current.data?.total).toBe(3);
		expect(fetchMock.mock.calls[0][0]).toBe(
			"/api/applicants?page=1&pageSize=25",
		);
	});

	it("reports errors and retries the same request on reload", async () => {
		fetchMock.mockResolvedValueOnce(json({ error: "x" }, 500));
		fetchMock.mockResolvedValueOnce(json(page(1)));
		const { result } = renderHook(() => useApplicants("q=a"));
		await waitFor(() => expect(result.current.status).toBe("error"));
		act(() => result.current.reload());
		await waitFor(() => expect(result.current.status).toBe("success"));
		expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
			"/api/applicants?q=a",
			"/api/applicants?q=a",
		]);
	});

	it("ignores a stale response after the query changed", async () => {
		let resolveFirst!: (r: Response) => void;
		fetchMock.mockImplementationOnce(
			() => new Promise<Response>((resolve) => (resolveFirst = resolve)),
		);
		fetchMock.mockResolvedValueOnce(json(page(2)));
		const { result, rerender } = renderHook(({ q }) => useApplicants(q), {
			initialProps: { q: "q=old" },
		});
		rerender({ q: "q=new" });
		await waitFor(() => expect(result.current.status).toBe("success"));
		resolveFirst(json(page(99)));
		await new Promise((r) => setTimeout(r, 0));
		expect(result.current.data?.total).toBe(2);
	});

	it("redirects to the login page with the current URL on 401", async () => {
		fetchMock.mockResolvedValue(json({ error: "Unauthorized" }, 401));
		const { result } = renderHook(() => useApplicants("page=2"));
		await waitFor(() =>
			expect(location.href).toBe(
				"/login?callbackUrl=%2Fapplicants%3Fpage%3D2",
			),
		);
		expect(result.current.status).toBe("loading");
	});
});
