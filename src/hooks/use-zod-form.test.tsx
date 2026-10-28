import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { z } from "zod";
import { useZodForm } from "./use-zod-form";

it("validates and transforms values through the Zod resolver", async () => {
	const schema = z.object({ value: z.string().min(1).transform(Number) });
	const { result } = renderHook(() =>
		useZodForm(schema, { defaultValues: { value: "" } }),
	);
	const onSubmit = vi.fn();

	await act(async () => {
		await result.current.handleSubmit(onSubmit)();
	});
	expect(onSubmit).not.toHaveBeenCalled();

	act(() => result.current.setValue("value", "42"));
	await act(async () => {
		await result.current.handleSubmit(onSubmit)();
	});
	await waitFor(() =>
		expect(onSubmit).toHaveBeenCalledWith({ value: 42 }, undefined),
	);
});
