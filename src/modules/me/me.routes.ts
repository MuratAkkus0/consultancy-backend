import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { meController } from "./me.controller.js";
import {
  validateBody,
  validateBodyByRole,
  validateParams,
  validateQuery,
} from "../../middleware/validate.middleware.js";
import {
  editAdminSelfSchema,
  editConsultantSelfSchema,
  editStudentSelfSchema,
} from "./me.validators.js";
import { paginationSchema, uuidParamSchema } from "../../lib/validators.js";
import {
  createDocumentSchema,
  myDocumentQuerySchema,
} from "../documents/documents.validators.js";
import { requireRole } from "../../middleware/role.middleware.js";
import { studentPaymentQuerySchema } from "../payments/payments.validators.js";
import { studentApplicationQuerySchema } from "../applications/applications.validators.js";
import { studentAppointmentQuerySchema } from "../appointments/appointments.validators.js";
import { registerRoute } from "../../lib/openapi.js";
import {
  consultantEditAssignmentSchema,
  studentEditAssignmentSchema,
} from "../assignments/assignments.validators.js";

const router = Router();

const AUTH_ERRORS = {
  401: { description: "Not authenticated" },
} as const;

// Get the authenticated user's own profile (id comes from the session)
registerRoute({
  method: "get",
  path: "/api/v1/me",
  tags: ["Me"],
  summary: "Get my profile",
  description: "Returns the authenticated user with its role-specific profile.",
  responses: {
    200: { description: "The authenticated user's profile" },
    404: { description: "User not found" },
    ...AUTH_ERRORS,
  },
});
router.get("/", requireAuth, meController.getProfile);

// Update the authenticated user's own profile. The body schema is chosen
// from the session role, so a student, consultant and admin each get their
// own set of editable fields.
registerRoute({
  method: "patch",
  path: "/api/v1/me",
  tags: ["Me"],
  summary: "Update my profile",
  description:
    "Updates the authenticated user's own fields. The request body is validated by role: a student, consultant and admin each get their own editable set (email, role and status are never editable here).",
  request: { body: editStudentSelfSchema },
  responses: {
    200: { description: "Updated profile" },
    400: { description: "Validation error" },
    ...AUTH_ERRORS,
  },
});
router.patch(
  "/",
  requireAuth,
  validateBodyByRole({
    student: editStudentSelfSchema,
    consultant: editConsultantSelfSchema,
    admin: editAdminSelfSchema,
  }),
  meController.editProfile,
);

// Close the authenticated user's own account. Deactivates the account, ends
// all sessions and removes the user's uploaded documents. Identity fields
// (email, phone) are retained; the account cannot be used until reactivated.
registerRoute({
  method: "delete",
  path: "/api/v1/me",
  tags: ["Me"],
  summary: "Close my account",
  description:
    "Deactivates the authenticated student's account (status becomes inactive), ends all sessions and removes their uploaded documents. Contact details are retained.",
  responses: {
    200: { description: "The deactivated user" },
    404: { description: "User not found" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.delete(
  "/",
  requireAuth,
  requireRole("student"),
  meController.softDeleteMe,
);

// Permanently delete the authenticated user's account (GDPR erasure).
// Anonymizes personal data, destroys credentials and sessions, and deletes
// the user's documents and role profile. Irreversible; records that must be
// retained (e.g. payments) are kept in anonymized form.
registerRoute({
  method: "delete",
  path: "/api/v1/me/permanent",
  tags: ["Me"],
  summary: "Permanently delete my account (GDPR)",
  description:
    "Erases the authenticated student's personal data: the user is anonymized, credentials and sessions are destroyed, and documents and the student profile are deleted. Irreversible.",
  responses: {
    200: { description: "The anonymized user" },
    404: { description: "User not found" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.delete(
  "/permanent",
  requireAuth,
  requireRole("student"),
  meController.hardDeleteMe,
);

// Get the authenticated user's own courses
registerRoute({
  method: "get",
  path: "/api/v1/me/courses",
  tags: ["Me"],
  summary: "List my courses",
  description:
    "A student gets the courses they are enrolled in; a consultant gets the courses they own.",
  request: { query: paginationSchema },
  responses: {
    200: { description: "The authenticated user's courses" },
    403: { description: "Student or consultant role required" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/courses",
  requireAuth,
  requireRole("student", "consultant"),
  validateQuery(paginationSchema),
  meController.getCourses,
);

// Get the authenticated user's own payments
registerRoute({
  method: "get",
  path: "/api/v1/me/payments",
  tags: ["Me"],
  summary: "List my payments",
  description: "Returns only the authenticated student's own payments.",
  request: { query: studentPaymentQuerySchema },
  responses: {
    200: { description: "The authenticated student's payments" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/payments",
  requireAuth,
  requireRole("student"),
  validateQuery(studentPaymentQuerySchema),
  meController.getPayments,
);

// Get the authenticated student's own applications
registerRoute({
  method: "get",
  path: "/api/v1/me/applications",
  tags: ["Me"],
  summary: "List my applications",
  description:
    "Returns only the authenticated student's own applications with the consultant's identity. Optionally filter by status. The consultant's private notes are never included.",
  request: { query: studentApplicationQuerySchema },
  responses: {
    200: { description: "The authenticated student's applications" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/applications",
  requireAuth,
  requireRole("student"),
  validateQuery(studentApplicationQuerySchema),
  meController.getApplications,
);

// Get the authenticated student's own appointments
registerRoute({
  method: "get",
  path: "/api/v1/me/appointments",
  tags: ["Me"],
  summary: "List my appointments",
  description:
    "Returns only the authenticated student's own appointments with the consultant's identity, ordered by scheduledAt (soonest first). Optionally filter by a datetime range (from/to).",
  request: { query: studentAppointmentQuerySchema },
  responses: {
    200: { description: "The authenticated student's appointments" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/appointments",
  requireAuth,
  requireRole("student"),
  validateQuery(studentAppointmentQuerySchema),
  meController.getAppointments,
);

// Get the students assigned to the authenticated consultant
registerRoute({
  method: "get",
  path: "/api/v1/me/assignments",
  tags: ["Me"],
  summary: "List my assigned students",
  description:
    "Returns the authenticated consultant's active assignments. Each item is the assignment record (id, createdAt) with the assigned student embedded.",
  request: { query: paginationSchema },
  responses: {
    200: { description: "The authenticated consultant's assignments" },
    403: { description: "Consultant role required" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/assignments",
  requireAuth,
  requireRole("consultant"),
  validateQuery(paginationSchema),
  meController.getAssignments,
);

// The authenticated student sets their feedback on their own active
// assignment (there is only one, so no id is needed — it comes from the session).
registerRoute({
  method: "patch",
  path: "/api/v1/me/assignments",
  tags: ["Me"],
  summary: "Update my feedback for my consultant",
  description:
    "Sets the authenticated student's feedback on their own active assignment.",
  request: { body: studentEditAssignmentSchema },
  responses: {
    200: { description: "The updated assignment" },
    400: { description: "Validation error" },
    404: { description: "Assignment not found" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.patch(
  "/assignments",
  requireAuth,
  requireRole("student"),
  validateBody(studentEditAssignmentSchema),
  meController.updateStudentFeedback,
);

// The authenticated consultant replaces their notes on one of their assigned
// students. Scoped by consultantId + studentId, so a consultant can only reach
// a student actually assigned to them (otherwise 404).
registerRoute({
  method: "patch",
  path: "/api/v1/me/assignments/:id",
  tags: ["Me"],
  summary: "Update my notes on an assigned student",
  description:
    "Replaces the authenticated consultant's notes on the assignment for the given assigned student.",
  request: {
    params: uuidParamSchema,
    body: consultantEditAssignmentSchema,
  },
  responses: {
    200: { description: "The updated assignment" },
    400: { description: "Validation error" },
    404: { description: "Assignment not found" },
    403: { description: "Consultant role required" },
    ...AUTH_ERRORS,
  },
});
router.patch(
  "/assignments/:id",
  requireAuth,
  requireRole("consultant"),
  validateParams(uuidParamSchema),
  validateBody(consultantEditAssignmentSchema),
  meController.updateConsultantNotes,
);

// Get the consultant assigned to the authenticated student
registerRoute({
  method: "get",
  path: "/api/v1/me/consultant",
  tags: ["Me"],
  summary: "Get my consultant",
  description:
    "Returns the authenticated student's active assignment (id, createdAt) with the assigned consultant embedded, or null when no consultant is assigned.",
  responses: {
    200: { description: "The authenticated student's consultant, or null" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/consultant",
  requireAuth,
  requireRole("student"),
  meController.getConsultant,
);

// Create an upload intent. The file itself never touches this API: the
// student declares the metadata, gets back the pending document record plus
// a short-lived presigned URL, and PUTs the file directly to S3.
registerRoute({
  method: "post",
  path: "/api/v1/me/documents",
  tags: ["Me"],
  summary: "Start a document upload",
  description:
    "Declares a file (name, type, mime, size) and returns { document, uploadUrl }. The client PUTs the file to uploadUrl (with the same Content-Type) and then confirms. The record stays 'pending' until confirmed.",
  request: { body: createDocumentSchema },
  responses: {
    201: { description: "{ document, uploadUrl }" },
    400: { description: "Validation error" },
    404: { description: "Document type not found" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.post(
  "/documents",
  requireAuth,
  requireRole("student"),
  validateBody(createDocumentSchema),
  meController.createDocument,
);

// Confirm that the upload to S3 succeeded. Verified against S3 itself.
registerRoute({
  method: "post",
  path: "/api/v1/me/documents/:id/confirm",
  tags: ["Me"],
  summary: "Confirm a document upload",
  description:
    "Marks the document as uploaded after verifying the object actually exists in storage. Idempotent: confirming an already-uploaded document is a no-op.",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "The confirmed document" },
    404: { description: "Document not found" },
    409: { description: "The file has not been uploaded yet" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.post(
  "/documents/:id/confirm",
  requireAuth,
  requireRole("student"),
  validateParams(uuidParamSchema),
  meController.confirmDocument,
);

// List the authenticated student's own documents (pending ones included).
registerRoute({
  method: "get",
  path: "/api/v1/me/documents",
  tags: ["Me"],
  summary: "List my documents",
  description:
    "All of the student's own non-deleted documents, including pending (unfinished) uploads. Optionally filter by documentTypeId.",
  request: { query: myDocumentQuerySchema },
  responses: {
    200: { description: "The authenticated student's documents" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/documents",
  requireAuth,
  requireRole("student"),
  validateQuery(myDocumentQuerySchema),
  meController.getDocuments,
);

// Get a short-lived download URL for one of the student's own documents.
registerRoute({
  method: "get",
  path: "/api/v1/me/documents/:id/download-url",
  tags: ["Me"],
  summary: "Get a download URL for my document",
  description:
    "Returns a short-lived presigned URL. Only uploaded documents are downloadable.",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "{ url } — expires in a few minutes" },
    404: { description: "Document not found" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/documents/:id/download-url",
  requireAuth,
  requireRole("student"),
  validateParams(uuidParamSchema),
  meController.getDocumentDownloadUrl,
);

// Soft-delete one of the student's own documents.
registerRoute({
  method: "delete",
  path: "/api/v1/me/documents/:id",
  tags: ["Me"],
  summary: "Delete my document",
  description:
    "Soft delete: the record is hidden, the stored file is kept. Works on pending uploads too, so an abandoned intent can be cleaned up by its owner.",
  request: { params: uuidParamSchema },
  responses: {
    200: { description: "The deleted document" },
    404: { description: "Document not found" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.delete(
  "/documents/:id",
  requireAuth,
  requireRole("student"),
  validateParams(uuidParamSchema),
  meController.deleteDocument,
);

// List the documents the authenticated student is required to provide, each
// with a `fulfilled` flag (true when they have an uploaded document of that
// type) so the UI can show what is still missing.
registerRoute({
  method: "get",
  path: "/api/v1/me/required-documents",
  tags: ["Me"],
  summary: "List my required documents",
  description:
    "The document types the student's consultant requires from them. Each item includes the document type, the consultant's note, and a `fulfilled` flag.",
  responses: {
    200: { description: "The authenticated student's required documents" },
    403: { description: "Student role required" },
    ...AUTH_ERRORS,
  },
});
router.get(
  "/required-documents",
  requireAuth,
  requireRole("student"),
  meController.getRequiredDocuments,
);

export default router;
