import { expect, it } from "vitest";
import { z } from "zod";
import { formatValidationErrors } from "./validation";

it("formats Zod errors into reusable field and form errors", () => {
	const result = z
		.object({ value: z.string().min(1) })
		.safeParse({ value: "" });
	expect(result.success).toBe(false);
	if (!result.success) {
		expect(
			formatValidationErrors(result.error).fieldErrors.value,
		).toHaveLength(1);
	}
});
