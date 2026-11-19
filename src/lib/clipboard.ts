/** Szöveg a vágólapra; `false`, ha a böngésző nem engedi. */
export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		return false;
	}
}
