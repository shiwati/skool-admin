import { describe, expect, it } from "vitest";
import { dataFileSchema } from "./seed-data-schema";
import { dashboardDemoData } from "./seed-demo-data";

const now = new Date("2026-11-19T10:00:00Z");

describe("dashboardDemoData", () => {
	const data = dashboardDemoData(now);

	it("is a valid seed data file", () => {
		expect(dataFileSchema.safeParse(data).success).toBe(true);
	});

	it("is deterministic", () => {
		expect(dashboardDemoData(now)).toEqual(data);
	});

	it("prefixes every id with demo_", () => {
		const ids = [
			...data.events,
			...data.applicants,
			...data.applications,
			...data.feedback,
		].map((r) => r.id);
		expect(ids.length).toBeGreaterThan(0);
		for (const id of ids) expect(id).toMatch(/^demo_/);
		for (const a of data.applications) {
			expect(a.eventId).toMatch(/^demo_/);
			expect(a.applicantId).toMatch(/^demo_/);
		}
	});

	it("covers last year, this year, the last 6 months and the future", () => {
		const starts = data.events.map((e) => e.from as Date);
		const months = new Set(
			starts.map((d) => `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`),
		);
		expect(starts.some((d) => d.getUTCFullYear() === 2025)).toBe(true);
		for (const m of [6, 7, 8, 9, 10, 11])
			expect(months.has(`2026-${m}`)).toBe(true);
		expect(starts.some((d) => d > now)).toBe(true);
	});

	it("never receives applications in the future", () => {
		expect(
			data.applications.every((a) => (a.receivedAt as Date) <= now),
		).toBe(true);
	});

	it("has over- and undersubscribed programs and repeat applicants", () => {
		const counts = new Map<string, number>();
		const perApplicant = new Map<string, number>();
		for (const a of data.applications) {
			counts.set(a.eventId, (counts.get(a.eventId) ?? 0) + 1);
			perApplicant.set(
				a.applicantId,
				(perApplicant.get(a.applicantId) ?? 0) + 1,
			);
		}
		const ratios = data.events.map(
			(e) => (counts.get(e.id) ?? 0) / e.capacity!,
		);
		expect(Math.max(...ratios)).toBeGreaterThan(2);
		expect(Math.min(...ratios)).toBeLessThan(1);
		expect([...perApplicant.values()].some((n) => n > 1)).toBe(true);
	});

	it("includes missing birth years and hometowns", () => {
		expect(data.applicants.some((a) => a.birthYear === null)).toBe(true);
		expect(data.applicants.some((a) => a.hometown === null)).toBe(true);
	});

	it("respects capacity: attended ≤ capacity, overflow rejected or waitlisted", () => {
		const statuses = new Set(data.applications.map((a) => a.status));
		for (const s of [
			"ATTENDED",
			"REJECTED",
			"WAITLISTED",
			"ACCEPTED",
			"APPLIED",
		])
			expect(statuses.has(s as never)).toBe(true);
		for (const e of data.events) {
			const attended = data.applications.filter(
				(a) => a.eventId === e.id && a.status === "ATTENDED",
			).length;
			expect(attended).toBeLessThanOrEqual(e.capacity!);
		}
	});

	it("has participant and mentor feedback only for ended events", () => {
		const ended = new Set(
			data.events.filter((e) => (e.to as Date) < now).map((e) => e.id),
		);
		expect(data.feedback.some((f) => f.role === "PARTICIPANT")).toBe(true);
		expect(data.feedback.some((f) => f.role === "MENTOR")).toBe(true);
		expect(data.feedback.every((f) => ended.has(f.eventId))).toBe(true);
		expect(
			data.feedback.every(
				(f) =>
					f.role === "MENTOR" ||
					typeof f.answers.mentorRating === "number",
			),
		).toBe(true);
		expect(new Set(data.feedback.map((f) => f.id)).size).toBe(
			data.feedback.length,
		);
	});
});
