import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  consultantAssignmentsTable,
  db,
  type documentsTable,
  documentTypesTable,
  users,
} from "../../db/index.js";
import { env } from "../../config/env.js";
import { isEmailConfigured, sendMail } from "../../lib/email/mailer.js";
import {
  documentReviewedForStudentEmail,
  documentUploadedForConsultantEmail,
  documentUploadedForStudentEmail,
} from "../../lib/email/templates.js";
import type { ReviewDocumentDTO } from "./documents.types.js";

const dashboardUrl = `${env.APP_WEB_URL}/dashboard`;

export type NotifiableDocument = Pick<
  typeof documentsTable.$inferSelect,
  "id" | "studentId" | "uploadedById" | "documentTypeId" | "documentName"
> & { updatedAt: Date };

const NON_NOTIFIABLE_STATUSES = new Set(["soft_deleted", "deleted"]);

interface Person {
  name: string;
  email: string;
  role: "admin" | "consultant" | "student";
}

const loadContext = async (documentTypeId: string, personIds: string[]) => {
  const [documentType, people] = await Promise.all([
    db.query.documentTypesTable.findFirst({
      where: eq(documentTypesTable.id, documentTypeId),
      columns: { name: true },
    }),
    db.query.users.findMany({
      where: inArray(users.id, personIds),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    }),
  ]);

  const byId = new Map<string, Person>();
  for (const person of people) {
    if (person.status && NON_NOTIFIABLE_STATUSES.has(person.status)) continue;
    byId.set(person.id, {
      name: person.name,
      email: person.email,
      role: person.role,
    });
  }

  return { documentTypeName: documentType?.name, person: byId };
};

const loadActiveConsultantId = async (studentId: string) => {
  const assignment = await db.query.consultantAssignmentsTable.findFirst({
    where: and(
      eq(consultantAssignmentsTable.studentId, studentId),
      isNull(consultantAssignmentsTable.deletedAt),
    ),
    columns: { consultantId: true },
  });
  return assignment?.consultantId;
};

const dispatch = (label: string, task: () => Promise<void>): void => {
  if (!isEmailConfigured) return;

  void task().catch((error: unknown) => {
    console.error(`[documents.notifications] ${label} gönderilemedi:`, error);
  });
};

export const notifyDocumentUploaded = (document: NotifiableDocument): void =>
  dispatch("upload", async () => {
    const selfUpload = document.uploadedById === document.studentId;

    const counterpartId = selfUpload
      ? await loadActiveConsultantId(document.studentId)
      : document.uploadedById;

    if (!counterpartId) return;

    const { documentTypeName, person } = await loadContext(
      document.documentTypeId,
      [document.studentId, counterpartId],
    );
    const student = person.get(document.studentId);
    const counterpart = person.get(counterpartId);
    if (!student || !counterpart || !documentTypeName) return;

    const shared = {
      documentName: document.documentName,
      documentTypeName,
      url: dashboardUrl,
      uploadedAt: document.updatedAt,
    };

    if (selfUpload) {
      await sendMail({
        to: counterpart.email,
        ...documentUploadedForConsultantEmail({
          recipientName: counterpart.name,
          uploaderName: student.name,
          ...shared,
        }),
      });
      return;
    }

    if (counterpart.role !== "consultant") return;

    await sendMail({
      to: student.email,
      ...documentUploadedForStudentEmail({
        recipientName: student.name,
        uploaderName: counterpart.name,
        ...shared,
      }),
    });
  });

export const notifyDocumentReviewed = (
  reviewerId: string,
  document: NotifiableDocument,
  reviewStatus: ReviewDocumentDTO["reviewStatus"],
): void =>
  dispatch("review→student", async () => {
    const { documentTypeName, person } = await loadContext(
      document.documentTypeId,
      [document.studentId, reviewerId],
    );
    const student = person.get(document.studentId);
    const reviewer = person.get(reviewerId);
    if (!student || !reviewer || !documentTypeName) return;
    if (reviewer.role !== "consultant") return;

    await sendMail({
      to: student.email,
      ...documentReviewedForStudentEmail({
        recipientName: student.name,
        reviewerName: reviewer.name,
        documentName: document.documentName,
        documentTypeName,
        reviewStatus,
        url: dashboardUrl,
        reviewedAt: document.updatedAt,
      }),
    });
  });
