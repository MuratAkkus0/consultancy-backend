import { and, eq, inArray, isNull, notInArray, or } from "drizzle-orm";
import { conversationsTable, db, users } from "../../db/index.js";
import {
  isPushConfigured,
  sendPushToUsers,
  type PushOptions,
  type PushPayload,
} from "../../lib/push.js";

// Payload urls are relative paths; the service worker opens them on the
// app's own origin.
const URLS = {
  messages: "/dashboard/messages",
  dashboard: "/dashboard",
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
        url: URLS.messages,
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
      url: URLS.dashboard,
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
      url: URLS.dashboard,
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
      url: URLS.dashboard,
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
      url: URLS.dashboard,
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
      url: URLS.dashboard,
      tag: `appointment:${appointment.id}`,
    }),
  );
