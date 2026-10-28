import "server-only";
import { parseEnv } from "@/lib/env-schema";

export const env = parseEnv(process.env);
