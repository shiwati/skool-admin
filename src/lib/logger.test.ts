// @vitest-environment node
import pino from "pino";
import { describe, expect, it } from "vitest";
import { logger, serializeError } from "./logger";

class PrismaClientKnownRequestError extends Error {
	name = "PrismaClientKnownRequestError";
	code = "P2002";
	meta = { target: ["email"] };
}

describe("serializeError", () => {
	it("drops the message and stack of Prisma errors", () => {
		const error = new PrismaClientKnownRequestError(
			"Invalid `prisma.applicant.update()` invocation: { email: 'kiss.anna@example.com' }",
		);
		const serialized = serializeError(error);
		expect(serialized).toEqual({
			type: "PrismaClientKnownRequestError",
			code: "P2002",
			meta: { target: ["email"] },
		});
		expect(JSON.stringify(serialized)).not.toContain("example.com");
	});

	it("keeps message and stack of other errors", () => {
		const serialized = serializeError(new TypeError("boom")) as {
			type: string;
			message: string;
			stack: string;
		};
		expect(serialized.type).toBe("TypeError");
		expect(serialized.message).toBe("boom");
		expect(serialized.stack).toContain("boom");
	});

	it("is the serializer the app logger uses for `err`", () => {
		const serializers = (
			logger as unknown as Record<symbol, Record<string, unknown>>
		)[pino.symbols.serializersSym];
		expect(serializers.err).toBe(serializeError);
	});
});
