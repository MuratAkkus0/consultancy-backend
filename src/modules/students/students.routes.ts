import { Router } from "express";
import {
  requireAuth,
  requireRole,
  validateParams,
  validateQuery,
} from "../../middleware/index.js";
import { paginationSchema, uuidParamSchema } from "../../lib/validators.js";
import { registerRoute } from "../../lib/openapi.js";
import { studentsController } from "./students.controller.js";

const router = Router();

registerRoute({
  method: "get",
  path: "/api/v1/students",
  tags: ["Students"],
  summary: "List students",
  request: { query: paginationSchema },
  responses: {
    200: { description: "Paginated list of students" },
    401: { description: "Not authenticated" },
    403: { description: "Insufficient role" },
  },
});
router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  validateQuery(paginationSchema),
  studentsController.list,
);

registerRoute({
  method: "get",
  path: "/api/v1/students/:id",
  tags: ["Students"],
  summary: "Get a student by id",
  description:
    "An admin gets any student; a consultant only gets a student actively assigned to them (anything else is a 404).",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "The student" },
    401: { description: "Not authenticated" },
    403: { description: "Admin or consultant role required" },
    404: { description: "Student not found" },
  },
});
router.get(
  "/:id",
  requireAuth,
  requireRole("admin", "consultant"),
  validateParams(uuidParamSchema),
  studentsController.getById,
);

export default router;
