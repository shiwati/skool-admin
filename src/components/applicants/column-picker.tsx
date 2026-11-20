"use client";

import { ColumnPicker as GenericColumnPicker } from "@/components/column-picker";
import {
	APPLICANT_COLUMN_CONFIG,
	type ColumnSettings,
} from "@/lib/applicants/column-settings";
import { COLUMNS } from "./columns";

/** Az oszlopválasztó a Jelentkezők listához. */
export function ColumnPicker(props: {
	settings: ColumnSettings;
	onChange: (settings: ColumnSettings) => void;
	compact?: boolean;
}) {
	return (
		<GenericColumnPicker
			config={APPLICANT_COLUMN_CONFIG}
			columns={COLUMNS}
			{...props}
		/>
	);
}
