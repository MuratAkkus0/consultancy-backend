import { and, eq, inArray, isNull, notInArray, or } from "drizzle-orm";
import {
  conversationsTable,
  coursesTable,
  db,
  studentCoursesTable,
  users,
} from "../../db/index.js";
import {
  isPushConfigured,
  sendPushToUsers,
  type PushOptions,
  type PushPayload,
} from "../../lib/push.js";

// Payload urls are relative paths; the service worker opens them on the
// app's own origin. Every section opens the dashboard root for now, until the
// frontend's section routes are settled.
export const PUSH_URLS = {
  messages: "/dashboard",
  applications: "/dashboard",
  appointments: "/dashboard",
  documents: "/dashboard",
  payments: "/dashboard",
  courses: "/dashboard",
} as const;

const NON_NOTIFIABLE_STATUSES = ["soft_deleted", "deleted"] as const;

const dispatch = (label: string, task: () => Promise<void>): void => {
  if (!isPushConfigured) return;

  void task().catch((error: unknown) => {
    console.error(`[push.notifications] ${label} could not be sent:`, error);
  });
};

// Recipients that are closed or erased are skipped. A null status counts as
// active, matching the column default.
const sendToActiveUsers = async (
  userIds: string[],
  payload: PushPayload,
  options?: PushOptions,
): Promise<void> => {
  if (userIds.length === 0) return;

  const active = await db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        inArray(users.id, userIds),
        or(
          isNull(users.status),
          notInArray(users.status, [...NON_NOTIFIABLE_STATUSES]),
        ),
      ),
    );

  await sendPushToUsers(
    active.map((user) => user.id),
    payload,
    options,
  );
};

export const notifyNewMessage = (message: {
  conversationId: string;
  senderId: string;
}): void =>
  dispatch("message", async () => {
    const [conversation, sender] = await Promise.all([
      db.query.conversationsTable.findFirst({
        where: eq(conversationsTable.id, message.conversationId),
        columns: { userAId: true, userBId: true },
      }),
      db.query.users.findFirst({
        where: eq(users.id, message.senderId),
        columns: { name: true },
      }),
    ]);
    if (!conversation || !sender) return;

    const recipientIds = [conversation.userAId, conversation.userBId].filter(
      (id) => id !== message.senderId,
    );

    await sendToActiveUsers(
      recipientIds,
      {
        title: "Yeni mesajınız var",
        body: `${sender.name} size bir mesaj gönderdi.`,
        url: PUSH_URLS.messages,
        tag: `conversation:${message.conversationId}`,
      },
      { urgency: "high" },
    );
  });

export const notifyApplicationCreated = (application: {
  id: string;
  studentId: string;
}): void =>
  dispatch("application created", () =>
    sendToActiveUsers([application.studentId], {
      title: "Yeni başvurunuz var",
      body: "Danışmanınız sizin için yeni bir başvuru oluşturdu.",
      url: PUSH_URLS.applications,
      tag: `application:${application.id}`,
    }),
  );

export const notifyApplicationUpdated = (application: {
  id: string;
  studentId: string;
}): void =>
  dispatch("application updated", () =>
    sendToActiveUsers([application.studentId], {
      title: "Başvurunuzda güncelleme var",
      body: "Başvurunuzla ilgili yeni bir güncelleme yapıldı.",
      url: PUSH_URLS.applications,
      tag: `application:${application.id}`,
    }),
  );

export const notifyAppointmentCreated = (appointment: {
  id: string;
  studentId: string;
}): void =>
  dispatch("appointment created", () =>
    sendToActiveUsers([appointment.studentId], {
      title: "Yeni randevunuz var",
      body: "Sizin için yeni bir randevu planlandı.",
      url: PUSH_URLS.appointments,
      tag: `appointment:${appointment.id}`,
    }),
  );

export const notifyAppointmentUpdated = (appointment: {
  id: string;
  studentId: string;
}): void =>
  dispatch("appointment updated", () =>
    sendToActiveUsers([appointment.studentId], {
      title: "Randevunuzda güncelleme var",
      body: "Randevunuzla ilgili yeni bir güncelleme yapıldı.",
      url: PUSH_URLS.appointments,
      tag: `appointment:${appointment.id}`,
    }),
  );

export const notifyAppointmentCancelled = (appointment: {
  id: string;
  studentId: string;
}): void =>
  dispatch("appointment cancelled", () =>
    sendToActiveUsers([appointment.studentId], {
      title: "Randevunuz iptal edildi",
      body: "Planlanan randevunuz iptal edildi.",
      url: PUSH_URLS.appointments,
      tag: `appointment:${appointment.id}`,
    }),
  );

export const notifyPaymentCreated = (payment: {
  id: string;
  studentId: string;
}): void =>
  dispatch("payment created", () =>
    sendToActiveUsers([payment.studentId], {
      title: "Yeni bir ödeme kaydınız var",
      body: "Hesabınıza yeni bir ödeme kaydı eklendi.",
      url: PUSH_URLS.payments,
      tag: `payment:${payment.id}`,
    }),
  );

export const notifyPaymentUpdated = (
  payment: { id: string; studentId: string; status: string },
  becamePaid: boolean,
): void =>
  dispatch("payment updated", () =>
    sendToActiveUsers(
      [payment.studentId],
      becamePaid
        ? {
            title: "Ödemeniz onaylandı",
            body: "Ödemeniz alındı olarak işaretlendi.",
            url: PUSH_URLS.payments,
            tag: `payment:${payment.id}`,
          }
        : {
            title: "Ödeme kaydınızda güncelleme var",
            body: "Ödeme kaydınızla ilgili yeni bir güncelleme yapıldı.",
            url: PUSH_URLS.payments,
            tag: `payment:${payment.id}`,
          },
    ),
  );

export const notifyDocumentRequested = (requirement: {
  id: string;
  studentId: string;
}): void =>
  dispatch("document requested", () =>
    sendToActiveUsers([requirement.studentId], {
      title: "Sizden yeni bir evrak istendi",
      body: "Danışmanınız sizden yeni bir evrak yüklemenizi istedi.",
      url: PUSH_URLS.documents,
      tag: `required-document:${requirement.id}`,
    }),
  );

const loadEnrolledStudentIds = async (courseId: string): Promise<string[]> => {
  const rows = await db
    .select({ studentId: studentCoursesTable.studentId })
    .from(studentCoursesTable)
    .where(
      and(
        eq(studentCoursesTable.courseId, courseId),
        isNull(studentCoursesTable.deletedAt),
      ),
    );
  return rows.map((row) => row.studentId);
};

export const notifyCourseEnrolled = (enrollment: {
  courseId: string;
  studentId: string;
}): void =>
  dispatch("course enrolled", async () => {
    const course = await db.query.coursesTable.findFirst({
      where: eq(coursesTable.id, enrollment.courseId),
      columns: { courseName: true },
    });
    if (!course) return;

    await sendToActiveUsers([enrollment.studentId], {
      title: "Yeni bir kursa kaydedildiniz",
      body: `"${course.courseName}" kursuna kaydınız yapıldı.`,
      url: PUSH_URLS.courses,
      tag: `course:${enrollment.courseId}`,
    });
  });

export const notifyCourseUnenrolled = (enrollment: {
  courseId: string;
  studentId: string;
}): void =>
  dispatch("course unenrolled", async () => {
    const course = await db.query.coursesTable.findFirst({
      where: eq(coursesTable.id, enrollment.courseId),
      columns: { courseName: true },
    });
    if (!course) return;

    await sendToActiveUsers([enrollment.studentId], {
      title: "Kurs kaydınız kaldırıldı",
      body: `"${course.courseName}" kursundaki kaydınız kaldırıldı.`,
      url: PUSH_URLS.courses,
      tag: `course:${enrollment.courseId}`,
    });
  });

export const notifyCourseUpdated = (course: {
  id: string;
  courseName: string;
}): void =>
  dispatch("course updated", async () => {
    await sendToActiveUsers(await loadEnrolledStudentIds(course.id), {
      title: "Kursunuzda güncelleme var",
      body: `"${course.courseName}" kursunda bir güncelleme yapıldı.`,
      url: PUSH_URLS.courses,
      tag: `course:${course.id}`,
    });
  });

// Enrollments are left untouched by a soft delete, so the enrolled students
// can still be found after the course row is marked deleted.
export const notifyCourseCancelled = (course: {
  id: string;
  courseName: string;
}): void =>
  dispatch("course cancelled", async () => {
    await sendToActiveUsers(await loadEnrolledStudentIds(course.id), {
      title: "Kursunuz iptal edildi",
      body: `"${course.courseName}" kursu iptal edildi.`,
      url: PUSH_URLS.courses,
      tag: `course:${course.id}`,
    });
  });

export const notifyCourseAssignedToConsultant = (course: {
  id: string;
  courseName: string;
  consultantId: string;
}): void =>
  dispatch("course assigned", () =>
    sendToActiveUsers([course.consultantId], {
      title: "Size yeni bir kurs atandı",
      body: `"${course.courseName}" kursu size atandı.`,
      url: PUSH_URLS.courses,
      tag: `course:${course.id}`,
    }),
  );
