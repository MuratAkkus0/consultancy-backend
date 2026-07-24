import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requireRole } from "../../middleware/role.middleware.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../middleware/validate.middleware.js";
import { uuidParamSchema } from "../../lib/validators.js";
import { registerRoute } from "../../lib/openapi.js";
import { paymentsController } from "./payments.controller.js";
import {
  createPaymentSchema,
  editPaymentSchema,
  paymentQuerySchema,
  revenueQuerySchema,
} from "./payments.validators.js";

// All payment operations are admin-only.
const router = Router();

const ADMIN_ERRORS = {
  401: { description: "Not authenticated" },
  403: { description: "Admin role required" },
} as const;

// Record a payment
registerRoute({
  method: "post",
  path: "/api/v1/payments",
  tags: ["Payments"],
  summary: "Record a payment",
  description: "Admin manually records a payment for a student.",
  request: { body: createPaymentSchema },
  responses: {
    201: { description: "Payment recorded" },
    400: { description: "Validation error" },
    404: { description: "Student not found" },
    ...ADMIN_ERRORS,
  },
});
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validateBody(createPaymentSchema),
  paymentsController.create,
);

// List payments (paginated, filter by studentId, sortable)
registerRoute({
  method: "get",
  path: "/api/v1/payments",
  tags: ["Payments"],
  summary: "List payments",
  description:
    "Paginated. Optionally filter by studentId; sortable by paidAt, amount or createdAt.",
  request: { query: paymentQuerySchema },
  responses: { 200: { description: "List of payments" }, ...ADMIN_ERRORS },
});
router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  validateQuery(paymentQuerySchema),
  paymentsController.list,
);

// Revenue aggregates (monthly/yearly) - must be declared before "/:id"
registerRoute({
  method: "get",
  path: "/api/v1/payments/revenue",
  tags: ["Payments"],
  summary: "Revenue aggregates",
  description:
    "Total revenue grouped by month or year, optionally filtered to a single year.",
  request: { query: revenueQuerySchema },
  responses: { 200: { description: "Revenue buckets" }, ...ADMIN_ERRORS },
});
router.get(
  "/revenue",
  requireAuth,
  requireRole("admin"),
  validateQuery(revenueQuerySchema),
  paymentsController.revenue,
);

// Get a payment by id
registerRoute({
  method: "get",
  path: "/api/v1/payments/:id",
  tags: ["Payments"],
  summary: "Get a payment by id",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Payment" },
    404: { description: "Payment not found" },
    ...ADMIN_ERRORS,
  },
});
router.get(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  paymentsController.getById,
);

// Edit a payment
registerRoute({
  method: "patch",
  path: "/api/v1/payments/:id",
  tags: ["Payments"],
  summary: "Edit a payment",
  request: { params: uuidParamSchema, body: editPaymentSchema },
  responses: {
    200: { description: "Payment updated" },
    400: { description: "Validation error" },
    404: { description: "Payment not found" },
    ...ADMIN_ERRORS,
  },
});
router.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  validateBody(editPaymentSchema),
  paymentsController.editById,
);

// Soft-delete a payment
registerRoute({
  method: "delete",
  path: "/api/v1/payments/:id",
  tags: ["Payments"],
  summary: "Soft-delete a payment",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Payment soft-deleted" },
    404: { description: "Payment not found" },
    ...ADMIN_ERRORS,
  },
});
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  paymentsController.softDeleteById,
);

export default router;
