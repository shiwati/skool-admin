"use client";

import { signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
	label: string;
	callbackUrl: string;
};

export function GoogleSignInButton({ label, callbackUrl }: Props) {
	const [pending, setPending] = useState(false);
	// Guards against a second click landing before React re-renders.
	const started = useRef(false);

	// Coming back from Google via the Back button restores this page from the
	// bfcache with the busy state frozen; reset so the user can try again.
	useEffect(() => {
		function onPageShow(event: PageTransitionEvent) {
			if (!event.persisted) return;
			started.current = false;
			setPending(false);
		}
		window.addEventListener("pageshow", onPageShow);
		return () => window.removeEventListener("pageshow", onPageShow);
	}, []);

	if (pending) {
		return (
			<Button variant="surface" size="pill" disabled aria-busy="true">
				<Spinner />
				Átirányítás a Google-höz…
			</Button>
		);
	}

	return (
		<Button
			variant="surface"
			size="pill"
			onClick={() => {
				if (started.current) return;
				started.current = true;
				setPending(true);
				void signIn("google", { callbackUrl });
			}}
		>
			<GoogleIcon />
			{label}
		</Button>
	);
}

function Spinner() {
	return (
		<svg
			viewBox="0 0 16 16"
			fill="none"
			strokeWidth={2}
			strokeLinecap="round"
			aria-hidden="true"
			className="animate-spin motion-reduce:animate-none"
			data-testid="spinner"
		>
			<circle cx="8" cy="8" r="6.5" stroke="#C9D2DD" />
			<path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="#121417" />
		</svg>
	);
}

function GoogleIcon() {
	return (
		<svg viewBox="0 0 48 48" aria-hidden="true">
			<path
				fill="#FFC107"
				d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"
			/>
			<path
				fill="#FF3D00"
				d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
			/>
			<path
				fill="#4CAF50"
				d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
			/>
			<path
				fill="#1976D2"
				d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
			/>
		</svg>
	);
}
