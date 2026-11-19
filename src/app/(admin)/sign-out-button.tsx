"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
	const [pending, setPending] = useState(false);

	return (
		<Button
			variant="outline"
			disabled={pending}
			aria-busy={pending || undefined}
			onClick={() => {
				if (pending) return;
				setPending(true);
				void signOut({ callbackUrl: "/login" });
			}}
		>
			<LogOut aria-hidden="true" />
			Kijelentkezés
		</Button>
	);
}
