import { UserMenu, type ShellUser } from "./user-menu";

// The design's global search and notifications have no backing feature yet,
// so the topbar only carries the signed-in user.
export function AdminTopbar({ user }: { user: ShellUser }) {
	return (
		<header className="flex h-16 items-center gap-4 border-b border-border-default bg-white px-8">
			<div className="flex-1" />
			<UserMenu user={user} />
		</header>
	);
}
