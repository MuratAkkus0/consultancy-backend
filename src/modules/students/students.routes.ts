import { Router } from "express";
import {
  requireAuth,
  requireRole,
  validateParams,
  validateQuery,
} from "../../middleware/index.js";
import { paginationSchema, uuidParamSchema } from "../../lib/validators.js";
import { studentsController } from "./students.controller.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireRole("admin", "consultant"),
  validateQuery(paginationSchema),
  studentsController.list,
);

router.get(
  "/:id",
  requireAuth,
  requireRole("admin", "consultant"),
  validateParams(uuidParamSchema),
  studentsController.getById,
);

export default router;
