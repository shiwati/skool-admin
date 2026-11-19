import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(cleanup);

// jsdom lacks a few browser APIs that Radix UI (popover, dropdown, dialog,
// checkbox) relies on.
if (typeof window !== "undefined") {
	window.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
	window.HTMLElement.prototype.scrollIntoView ??= function () {};
	window.HTMLElement.prototype.hasPointerCapture ??= () => false;
	window.HTMLElement.prototype.releasePointerCapture ??= function () {};
}
