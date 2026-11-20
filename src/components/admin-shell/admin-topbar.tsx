import { cn } from "@/lib/utils";
import { UserMenu, type ShellUser } from "./user-menu";

// The design's global search and notifications have no backing feature yet,
// so the topbar only carries the signed-in user.
export function AdminTopbar({
	user,
	className,
}: {
	user: ShellUser;
	className?: string;
}) {
	return (
		<header
			className={cn(
				"flex h-16 items-center gap-4 border-b border-border-default bg-white px-6 xl:px-8",
				className,
			)}
		>
			<div className="flex-1" />
			<UserMenu user={user} />
		</header>
	);
}
