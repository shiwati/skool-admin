import { expect, it } from "vitest";
import { cn } from "./utils";

it("merges conditional and conflicting Tailwind classes", () => {
	expect(cn("px-2 py-4", false && "hidden", { block: true }, "px-6")).toBe(
		"py-4 block px-6",
	);
});
