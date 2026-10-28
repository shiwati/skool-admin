import { z } from "zod";

export function formatValidationErrors<T>(error: z.ZodError<T>) {
	return z.flattenError(error);
}
