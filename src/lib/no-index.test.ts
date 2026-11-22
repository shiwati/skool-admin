// @vitest-environment node
import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";
import { NO_INDEX_HEADER, noIndexRobots } from "./no-index";

describe("search engine exclusion", () => {
	it("sends X-Robots-Tag noindex on every path", async () => {
		const rules = (await nextConfig.headers?.()) ?? [];
		const all = rules.find((rule) => rule.source === "/:path*");
		expect(all?.headers).toContainEqual({
			key: "X-Robots-Tag",
			value: "noindex, nofollow, noarchive",
		});
		expect(NO_INDEX_HEADER.value).toContain("noindex");
	});

	it("marks every page noindex, nofollow in the robots metadata", () => {
		expect(noIndexRobots).toMatchObject({
			index: false,
			follow: false,
			googleBot: { index: false, follow: false },
		});
	});
});
