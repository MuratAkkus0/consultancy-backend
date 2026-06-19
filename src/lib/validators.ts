import z from "zod";
import { userRoleEnum } from "../db/index.js";

export const roleSchema = z.enum(userRoleEnum.enumValues);
