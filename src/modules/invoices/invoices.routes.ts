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
import { invoicesController } from "./invoices.controller.js";
import {
  createInvoiceSchema,
  editInvoiceSchema,
  invoiceQuerySchema,
} from "./invoices.validators.js";

// All invoice operations are admin-only.
const router = Router();

const ADMIN_ERRORS = {
  401: { description: "Not authenticated" },
  403: { description: "Admin role required" },
} as const;

// Create an invoice (upload intent)
registerRoute({
  method: "post",
  path: "/api/v1/invoices",
  tags: ["Invoices"],
  summary: "Create an invoice and get an upload URL",
  description:
    "Declares an invoice (income or expense) and its PDF, and returns { invoice, uploadUrl }. The client PUTs the file to uploadUrl and then confirms. invoiceNumber is required for income and optional for expense; blank values count as missing. Numbers are globally unique, including those of soft-deleted invoices; only an abandoned upload (pending, never confirmed, presigned URL expired) releases its number, and a new create with that number replaces it. A still-fresh pending upload with the same number returns 409 (in progress). currency defaults to EUR.",
  request: { body: createInvoiceSchema },
  responses: {
    201: { description: "{ invoice, uploadUrl }" },
    400: { description: "Validation error (e.g. income without a number)" },
    409: { description: "Invoice number already exists" },
    ...ADMIN_ERRORS,
  },
});
router.post(
  "/",
  requireAuth,
  requireRole("admin"),
  validateBody(createInvoiceSchema),
  invoicesController.create,
);

// Confirm the upload went through
registerRoute({
  method: "post",
  path: "/api/v1/invoices/:id/confirm",
  tags: ["Invoices"],
  summary: "Confirm an invoice upload",
  description:
    "Marks the invoice as uploaded after verifying the object exists in storage. Idempotent.",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "The confirmed invoice" },
    404: { description: "Invoice not found" },
    409: { description: "The file has not been uploaded yet" },
    ...ADMIN_ERRORS,
  },
});
router.post(
  "/:id/confirm",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  invoicesController.confirm,
);

// List invoices
registerRoute({
  method: "get",
  path: "/api/v1/invoices",
  tags: ["Invoices"],
  summary: "List invoices",
  description:
    "Paginated, newest invoiceDate first; only uploaded, non-deleted invoices. Optional filters: year, month (only together with year) and type. The year/month window is the calendar period in Europe/Berlin time. `summary` holds income and expense totals of the whole filtered set (not just the page), one entry per currency.",
  request: { query: invoiceQuerySchema },
  responses: {
    200: {
      description:
        "{ data, pagination: { page, limit, total }, summary: [{ currency, incomeTotal, expenseTotal }] }",
    },
    400: { description: "Validation error (e.g. month without year)" },
    ...ADMIN_ERRORS,
  },
});
router.get(
  "/",
  requireAuth,
  requireRole("admin"),
  validateQuery(invoiceQuerySchema),
  invoicesController.list,
);

// Get an invoice by id
registerRoute({
  method: "get",
  path: "/api/v1/invoices/:id",
  tags: ["Invoices"],
  summary: "Get an invoice by id",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Invoice" },
    404: { description: "Invoice not found" },
    ...ADMIN_ERRORS,
  },
});
router.get(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  invoicesController.getById,
);

// Short-lived download URL
registerRoute({
  method: "get",
  path: "/api/v1/invoices/:id/download-url",
  tags: ["Invoices"],
  summary: "Get a download URL for an invoice PDF",
  description:
    "Returns a short-lived presigned URL. Only uploaded invoices are downloadable.",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "{ url } - expires in a few minutes" },
    404: { description: "Invoice not found or not uploaded" },
    ...ADMIN_ERRORS,
  },
});
router.get(
  "/:id/download-url",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  invoicesController.getDownloadUrl,
);

// Edit invoice metadata
registerRoute({
  method: "patch",
  path: "/api/v1/invoices/:id",
  tags: ["Invoices"],
  summary: "Edit an invoice",
  description:
    "Partial update of the metadata; the PDF cannot be replaced. An income invoice must keep an invoice number (checked on the merged result). invoiceNumber may be set to null/blank for an expense.",
  request: { params: uuidParamSchema, body: editInvoiceSchema },
  responses: {
    200: { description: "Invoice updated" },
    400: { description: "Validation error (e.g. income without a number)" },
    404: { description: "Invoice not found" },
    409: { description: "Invoice number already exists" },
    ...ADMIN_ERRORS,
  },
});
router.patch(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  validateBody(editInvoiceSchema),
  invoicesController.editById,
);

// Soft-delete an invoice
registerRoute({
  method: "delete",
  path: "/api/v1/invoices/:id",
  tags: ["Invoices"],
  summary: "Soft-delete an invoice",
  description:
    "Hides the record; the S3 object is kept. The invoice number stays reserved (it cannot be reused by a new invoice), by design.",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "Invoice soft-deleted" },
    404: { description: "Invoice not found" },
    ...ADMIN_ERRORS,
  },
});
router.delete(
  "/:id",
  requireAuth,
  requireRole("admin"),
  validateParams(uuidParamSchema),
  invoicesController.softDeleteById,
);

export default router;
