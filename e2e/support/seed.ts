import { randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { assertE2eDatabase } from "./database";
import { ADMIN_USER, APPLICANTS, APPLICATIONS, EVENTS } from "./fixtures";

/**
 * Betölti a tesztadatot, és létrehoz egy admin sessiont. A NextAuth
 * adatbázisos sessiont használ, így egy `Session` sor és a hozzá tartozó
 * cookie elég a bejelentkezéshez: a Google-folyamat és az auth kód nem
 * változik.
 *
 * @returns a session token (a `next-auth.session-token` cookie értéke)
 */
export async function seedDatabase(databaseUrl: string): Promise<string> {
	assertE2eDatabase(new URL(databaseUrl));
	const db = new PrismaClient({
		adapter: new PrismaPg({ connectionString: databaseUrl }),
	});
	try {
		await db.user.create({ data: { ...ADMIN_USER } });
		await db.event.createMany({ data: EVENTS });
		await db.applicant.createMany({ data: APPLICANTS });
		await db.application.createMany({ data: APPLICATIONS });

		const sessionToken = randomBytes(32).toString("hex");
		await db.session.create({
			data: {
				sessionToken,
				userId: ADMIN_USER.id,
				expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
			},
		});
		return sessionToken;
	} finally {
		await db.$disconnect();
	}
}
