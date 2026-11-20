/** Egy jelentkező vagy program teljes változásnaplója (kliensről is importálható). */
export function historyHref(id: string) {
	return `/history/${encodeURIComponent(id)}`;
}
