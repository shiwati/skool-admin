import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePagedQuery } from "./use-paged-query";

const fetchMock = vi.fn();
const ok = (body: unknown) =>
	Promise.resolve(
		new Response(JSON.stringify(body), {
			status: 200,
			headers: { "content-type": "application/json" },
		}),
	);

describe("usePagedQuery", () => {
	beforeEach(() => {
		fetchMock.mockReset();
		vi.stubGlobal("fetch", fetchMock);
	});
	afterEach(() => vi.unstubAllGlobals());

	it("uses the server page without fetching", () => {
		const { result } = renderHook(() =>
			usePagedQuery("/api/x?page=1", {
				url: "/api/x?page=1",
				data: { n: 1 },
			}),
		);
		expect(result.current.result).toEqual({
			status: "success",
			data: { n: 1 },
		});
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("fetches a new URL and reports errors", async () => {
		fetchMock.mockImplementationOnce(() => ok({ n: 2 }));
		const { result, rerender } = renderHook(
			({ url }) => usePagedQuery<{ n: number }>(url),
			{ initialProps: { url: "/api/x?page=2" } },
		);
		expect(result.current.result.status).toBe("loading");
		await waitFor(() =>
			expect(result.current.result).toEqual({
				status: "success",
				data: { n: 2 },
			}),
		);

		fetchMock.mockImplementationOnce(() =>
			Promise.resolve(new Response("{}", { status: 500 })),
		);
		rerender({ url: "/api/x?page=3" });
		await waitFor(() => expect(result.current.result.status).toBe("error"));
	});

	it("refetches on reload and changes the request key", async () => {
		fetchMock.mockImplementation(() => ok({ n: 1 }));
		const { result } = renderHook(() => usePagedQuery("/api/x"));
		await waitFor(() =>
			expect(result.current.result.status).toBe("success"),
		);
		const key = result.current.requestKey;
		act(() => result.current.reload());
		expect(result.current.requestKey).not.toBe(key);
		await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
	});

	it("adopts fresh server data, and refetches when it is gone", async () => {
		const { result, rerender } = renderHook(
			({ initial }) => usePagedQuery("/api/x", initial),
			{
				initialProps: {
					initial: { url: "/api/x", data: { n: 1 } },
				} as {
					initial?: { url: string; data: { n: number } };
				},
			},
		);
		rerender({ initial: { url: "/api/x", data: { n: 2 } } });
		expect(result.current.result).toEqual({
			status: "success",
			data: { n: 2 },
		});
		expect(fetchMock).not.toHaveBeenCalled();

		fetchMock.mockImplementationOnce(() => ok({ n: 3 }));
		rerender({ initial: undefined });
		await waitFor(() =>
			expect(result.current.result).toEqual({
				status: "success",
				data: { n: 3 },
			}),
		);
	});
});
