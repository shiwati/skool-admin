import type { MouseEvent } from "react";

/**
 * Clicks on (or inside) these keep their own behaviour instead of opening the
 * row's page. Menu items are portaled, but React events still bubble to the row.
 */
export const ROW_NAV_IGNORE =
	'a, button, input, label, [role="checkbox"], [role="menuitem"], [role="menu"], [data-row-nav="off"]';

/**
 * Egész sor (vagy kártya) linkként: a soron belüli interaktív elemek és a
 * szövegkijelölés nem navigál; Ctrl/⌘ + kattintás új lapon nyit.
 */
export function openRowHref(
	event: MouseEvent<Element>,
	href: string,
	push: (href: string) => void,
): void {
	const target = event.target;
	if (target instanceof Element && target.closest(ROW_NAV_IGNORE)) return;
	// Selecting text in a cell is not a click on the row.
	if (window.getSelection()?.toString()) return;
	if (event.ctrlKey || event.metaKey) window.open(href, "_blank");
	else push(href);
}
