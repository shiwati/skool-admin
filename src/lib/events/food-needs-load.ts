import "server-only";
import { db } from "@/lib/db";
import { FOOD_NEED_STATUSES, foodNeeds, type FoodNeeds } from "./food-needs";

/** Egy program étkezési igényei (Részt vett, Elfogadva, Új jelentkező). */
export async function getFoodNeeds(eventId: string): Promise<FoodNeeds> {
	const rows = await db.application.findMany({
		where: { eventId, status: { in: [...FOOD_NEED_STATUSES] } },
		select: {
			status: true,
			foodPreference: true,
			applicant: {
				select: {
					id: true,
					firstName: true,
					lastName: true,
					deletedAt: true,
				},
			},
		},
	});
	return foodNeeds(rows);
}
