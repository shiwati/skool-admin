import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminSession, redirect } = vi.hoisted(() => ({
	getAdminSession: vi.fn(),
	redirect: vi.fn((url: string) => {
		throw new Error(`NEXT_REDIRECT ${url}`);
	}),
}));
vi.mock("@/lib/session", () => ({ getAdminSession }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/env", () => ({
	env: {
		NEXTAUTH_URL: "http://localhost:3000",
		AUTH_ALLOWED_DOMAIN: "skool.org.hu",
	},
}));
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
vi.mock("next/image", () => ({
	// eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
	default: (props: React.ComponentProps<"img">) => <img {...props} />,
}));

import LoginPage from "./page";

async function renderPage(params: Record<string, string> = {}) {
	render(await LoginPage({ searchParams: Promise.resolve(params) }));
}

describe("LoginPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getAdminSession.mockResolvedValue(null);
	});

	it("shows the default state with only the Google sign-in action", async () => {
		await renderPage();
		expect(
			screen.getByRole("heading", { name: "Üdv újra!" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("heading", {
				level: 1,
				name: "SKOOL Menedzsment",
			}),
		).toBeInTheDocument();
		expect(screen.queryByRole("alert")).not.toBeInTheDocument();
		expect(screen.getAllByRole("button")).toHaveLength(1);
		expect(
			screen.getByRole("button", {
				name: "Bejelentkezés Google-fiókkal",
			}),
		).toBeInTheDocument();
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
		expect(document.querySelector("input")).toBeNull();
		expect(screen.getByAltText("Skool")).toBeInTheDocument();
		expect(
			screen.getByText(/Csak @skool\.org\.hu domainű Google-fiókkal/),
		).toBeInTheDocument();
	});

	it("shows the access-denied state naming the rejected account", async () => {
		await renderPage({
			error: "AccessDenied",
			account: "luca.nagy@gmail.com",
		});
		expect(
			screen.getByRole("heading", { name: "Nincs hozzáférésed" }),
		).toBeInTheDocument();
		const alert = screen.getByRole("alert");
		expect(alert).toHaveTextContent("Ez a fiók nem jogosult");
		expect(alert).toHaveTextContent(
			"A luca.nagy@gmail.com fiók nem tartozik a Skool szervezethez.",
		);
		expect(alert).toHaveTextContent("Lépj be @skool.org.hu fiókkal");
		expect(
			screen.getByRole("button", {
				name: "Másik Google-fiók választása",
			}),
		).toBeInTheDocument();
	});

	it.each([
		"not-an-email",
		"<script>alert(1)</script>@x",
		`${"a".repeat(250)}@gmail.com`,
	])("omits a malformed account %j from the banner", async (account) => {
		await renderPage({ error: "AccessDenied", account });
		const alert = screen.getByRole("alert");
		expect(alert).toHaveTextContent(
			"Ez a Google-fiók nem tartozik a Skool szervezethez.",
		);
		expect(alert).not.toHaveTextContent(account);
	});

	it("shows a generic retry banner for other errors without the code", async () => {
		await renderPage({ error: "OAuthCallback" });
		expect(
			screen.getByRole("heading", { name: "Üdv újra!" }),
		).toBeInTheDocument();
		const alert = screen.getByRole("alert");
		expect(alert).toHaveTextContent("A bejelentkezés nem sikerült");
		expect(alert).toHaveTextContent("Próbáld újra");
		expect(document.body).not.toHaveTextContent("OAuthCallback");
		expect(
			screen.getByRole("button", {
				name: "Bejelentkezés Google-fiókkal",
			}),
		).toBeInTheDocument();
	});

	it("redirects a signed-in user to the safe callback URL", async () => {
		getAdminSession.mockResolvedValue({ user: { name: "Anna" } });
		await expect(renderPage({ callbackUrl: "/programs" })).rejects.toThrow(
			"NEXT_REDIRECT",
		);
		expect(redirect).toHaveBeenCalledWith("/programs");
	});

	it("redirects a signed-in user to / for an off-site callback URL", async () => {
		getAdminSession.mockResolvedValue({ user: { name: "Anna" } });
		await expect(
			renderPage({ callbackUrl: "https://evil.example/" }),
		).rejects.toThrow("NEXT_REDIRECT");
		expect(redirect).toHaveBeenCalledWith("/");
	});
});

describe("LoginPage responsive layout", () => {
	beforeEach(() => getAdminSession.mockResolvedValue(null));

	it("stacks below desktop and hides the module chips on mobile", async () => {
		const { container } = render(
			await LoginPage({ searchParams: Promise.resolve({}) }),
		);
		expect(container.firstElementChild).toHaveClass(
			"flex-col",
			"xl:flex-row",
		);
		expect(screen.getByRole("list", { name: "Modulok" })).toHaveClass(
			"hidden",
			"md:flex",
		);
		const footers = screen.getAllByText(
			/© 2026 Skool Technológiai Alapítvány/,
		);
		expect(footers.map((f) => f.className)).toEqual([
			expect.stringContaining("xl:block"),
			expect.stringContaining("xl:hidden"),
		]);
	});
});
