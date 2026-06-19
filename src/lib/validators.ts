import z from "zod";
import { userRoleEnum } from "../db/index.js";

export const roleSchema = z.enum(userRoleEnum.enumValues);

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const uuidParamSchema = z.object({
  id: z.uuid(),
});
