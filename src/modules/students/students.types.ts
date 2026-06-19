import type z from "zod";
import type { paginationSchema, uuidParamSchema } from "../../lib/validators.js";

export type PaginationParams = z.infer<typeof paginationSchema>;
export type UuidParam = z.infer<typeof uuidParamSchema>;
