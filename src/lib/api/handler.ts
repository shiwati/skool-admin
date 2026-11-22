import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { logger } from "@/lib/logger";
import { getAdminSession } from "@/lib/session";
import { formatValidationErrors } from "@/lib/validation";
import { searchParamsToObject } from "./query";

const noStore = { "Cache-Control": "no-store" };

export function jsonResponse(body: unknown, status = 200) {
	return NextResponse.json(body, { status, headers: noStore });
}

export const unauthorized = () => jsonResponse({ error: "Unauthorized" }, 401);
export const notFound = () => jsonResponse({ error: "Not Found" }, 404);
export const internalError = () =>
	jsonResponse({ error: "Internal Server Error" }, 500);

/** A `400 Invalid request body` válasz, Zod-hibánál `details`-szel. */
export function invalidBody(error?: z.ZodError) {
	return jsonResponse(
		error
			? {
					error: "Invalid request body",
					details: formatValidationErrors(error),
				}
			: { error: "Invalid request body" },
		400,
	);
}

/**
 * Egy mezőre szóló `400`, ugyanolyan `details` alakkal, mint a Zod-hibák
 * (`formErrors`, `fieldErrors`), ha a szabály csak a mentett adattal együtt
 * ellenőrizhető.
 */
export function invalidField(field: string, message: string) {
	return jsonResponse(
		{
			error: "Invalid request body",
			details: { formErrors: [], fieldErrors: { [field]: [message] } },
		},
		400,
	);
}

/**
 * Bejelentkezést ellenőriz, validálja a query paramétereket, és
 * egységesen kezeli a hibákat.
 */
export async function handleQuery<S extends z.ZodType>(
	request: Request,
	schema: S,
	run: (query: z.output<S>) => Promise<Response>,
): Promise<Response> {
	const session = await getAdminSession();
	if (!session) return unauthorized();

	const url = new URL(request.url);
	const parsed = schema.safeParse(searchParamsToObject(url.searchParams));
	if (!parsed.success) {
		return jsonResponse(
			{
				error: "Invalid query parameters",
				details: formatValidationErrors(parsed.error),
			},
			400,
		);
	}

	try {
		return await run(parsed.data);
	} catch (error) {
		// Csak a pathname: a query string (pl. `q`) keresett nevet vagy
		// e-mail-címet tartalmazhat.
		logger.error(
			{ event: "api.request_failed", path: url.pathname, err: error },
			"API request failed",
		);
		return internalError();
	}
}

export type AdminContext = { userId: string };

export type AdminHandlerOptions = {
	/** A váratlan hiba log-eseménye, pl. `"applicant.merge_failed"`. */
	event: string;
	/** Ismert hibák saját válasza; `undefined` → váratlan hiba. */
	mapError?: (error: unknown) => Response | undefined;
	/** A váratlan hiba válasza (alapból `500 Internal Server Error`). */
	failure?: () => Response;
};

/**
 * Admin-session (felhasználó-azonosítóval) nélkül `401`, egyébként futtatja
 * a handlert. A dobott hibát előbb a `mapError` kapja; ami ott nem kap
 * választ, az a logba kerül (csak az út, a felhasználó és a hiba), a kliens
 * pedig részletek nélküli választ kap.
 */
export async function handleAdmin(
	request: Request,
	run: (ctx: AdminContext) => Promise<Response>,
	options: AdminHandlerOptions,
): Promise<Response> {
	const session = await getAdminSession();
	const userId = session?.user?.id;
	if (!userId) return unauthorized();

	try {
		return await run({ userId });
	} catch (error) {
		const mapped = options.mapError?.(error);
		if (mapped) return mapped;
		logger.error(
			{
				event: options.event,
				path: new URL(request.url).pathname,
				userId,
				err: error,
			},
			"API request failed",
		);
		return options.failure?.() ?? internalError();
	}
}

/** A kérés törzse JSON-ként; ha nem érvényes JSON, `ok: false`. */
export async function readJson(
	request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false }> {
	try {
		return { ok: true, body: await request.json() };
	} catch {
		return { ok: false };
	}
}

/**
 * Mint a `handleAdmin`, de előtte beolvassa és validálja a JSON-törzset:
 * nem JSON → `400 Invalid request body`, sémahiba → ugyanez `details`-szel.
 * A `select` a törzs egy részét adja a sémának (pl. `body.content`).
 */
export async function handleBody<S extends z.ZodType>(
	request: Request,
	schema: S,
	run: (data: z.output<S>, ctx: AdminContext) => Promise<Response>,
	options: AdminHandlerOptions & { select?: (body: unknown) => unknown },
): Promise<Response> {
	return handleAdmin(
		request,
		async (ctx) => {
			const json = await readJson(request);
			if (!json.ok) return invalidBody();
			const input = options.select
				? options.select(json.body)
				: json.body;
			const parsed = schema.safeParse(input);
			if (!parsed.success) return invalidBody(parsed.error);
			return run(parsed.data, ctx);
		},
		options,
	);
}
