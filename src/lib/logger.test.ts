// @vitest-environment node
import pino from "pino";
import { describe, expect, it } from "vitest";
import { logger, serializeError } from "./logger";

const PRIVATE_MESSAGE = `
Invalid \`prisma.applicant.update()\` invocation:
{ data: { comment: "Szia!
    at least kiss.anna@example.com" } }`;

class PrismaClientKnownRequestError extends Error {
	name = "PrismaClientKnownRequestError";
	code = "P2002";
	meta = { modelName: "Applicant", target: ["email"] };
}

class PrismaClientValidationError extends Error {
	name = "PrismaClientValidationError";
}

class PrismaClientInitializationError extends Error {
	name = "PrismaClientInitializationError";
	errorCode = "P1001";
}

type Serialized = Record<string, unknown> & { stack?: string };

describe("serializeError", () => {
	it("keeps code, meta and call sites of Prisma errors, not the message", () => {
		const serialized = serializeError(
			new PrismaClientKnownRequestError(PRIVATE_MESSAGE),
			"production",
		) as Serialized;
		expect(serialized).toMatchObject({
			type: "PrismaClientKnownRequestError",
			code: "P2002",
			meta: { modelName: "Applicant", target: ["email"] },
		});
		expect(serialized).not.toHaveProperty("message");
		expect(serialized.stack).toMatch(/^\s+at /);
		expect(JSON.stringify(serialized)).not.toContain("example.com");
		expect(JSON.stringify(serialized)).not.toContain("Invalid");
	});

	it("keeps only the type and call sites of validation errors", () => {
		const serialized = serializeError(
			new PrismaClientValidationError(PRIVATE_MESSAGE),
			"production",
		) as Serialized;
		expect(Object.keys(serialized).sort()).toEqual(["stack", "type"]);
		expect(serialized.stack).toContain("logger.test.ts");
		expect(JSON.stringify(serialized)).not.toContain("example.com");
	});

	it("keeps the message of connection errors", () => {
		const serialized = serializeError(
			new PrismaClientInitializationError(
				"Can't reach database server at `db:5432`",
			),
			"production",
		);
		expect(serialized).toMatchObject({
			type: "PrismaClientInitializationError",
			errorCode: "P1001",
			message: "Can't reach database server at `db:5432`",
		});
	});

	it("logs Prisma errors in full in development", () => {
		const serialized = serializeError(
			new PrismaClientValidationError(PRIVATE_MESSAGE),
			"development",
		) as Serialized;
		expect(serialized.message).toContain("kiss.anna@example.com");
	});

	it("keeps message and stack of other errors", () => {
		const serialized = serializeError(
			new TypeError("boom"),
			"production",
		) as Serialized;
		expect(serialized.type).toBe("TypeError");
		expect(serialized.message).toBe("boom");
		expect(serialized.stack).toContain("boom");
	});

	it("passes non-errors through", () => {
		expect(serializeError("text", "production")).toBe("text");
	});

	it("is the serializer the app logger uses for `err`", () => {
		const serializers = (
			logger as unknown as Record<symbol, Record<string, unknown>>
		)[pino.symbols.serializersSym];
		expect(serializers.err).toBe(serializeError);
	});
});
