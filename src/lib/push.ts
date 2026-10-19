import webpush from "web-push";
import { eq, inArray } from "drizzle-orm";
import { env } from "../config/env.js";
import { db, pushSubscriptionsTable } from "../db/index.js";
import { logger } from "./logger.js";

const log = logger.child({ module: "push" });

// Never put user-authored or sensitive content (message text, document names,
// notes) in a payload: it passes through third-party push services.
export interface PushPayload {
  title: string;
  body: string;
  // Relative path; the service worker resolves it against its own origin.
  url: string;
  // Notifications sharing a tag replace each other on the device.
  tag: string;
}

export interface PushOptions {
  urgency?: "very-low" | "low" | "normal" | "high";
}

const TTL_SECONDS = 24 * 60 * 60;

const initVapid = (): boolean => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
    log.warn("VAPID keys not configured - push is disabled");
    return false;
  }
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    return true;
  } catch (err) {
    log.error({ err }, "invalid VAPID configuration - push is disabled");
    return false;
  }
};

export const isPushConfigured = initVapid();

// 404/410 mean the browser revoked or dropped the subscription for good.
const isGone = (err: unknown): boolean =>
  typeof err === "object" &&
  err !== null &&
  "statusCode" in err &&
  (err.statusCode === 404 || err.statusCode === 410);

type SubscriptionRow = typeof pushSubscriptionsTable.$inferSelect;

const sendToSubscription = async (
  subscription: SubscriptionRow,
  body: string,
  options: PushOptions,
): Promise<void> => {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      body,
      { TTL: TTL_SECONDS, urgency: options.urgency ?? "normal" },
    );
  } catch (err) {
    if (isGone(err)) {
      await db
        .delete(pushSubscriptionsTable)
        .where(eq(pushSubscriptionsTable.id, subscription.id))
        .catch((deleteErr: unknown) => {
          log.error({ err: deleteErr }, "failed to remove expired subscription");
        });
      return;
    }
    // The raw error carries the endpoint capability URL and response body.
    const statusCode =
      typeof err === "object" && err !== null && "statusCode" in err
        ? err.statusCode
        : undefined;
    log.error(
      {
        statusCode,
        reason: err instanceof Error ? err.message : "unknown error",
      },
      "failed to send notification",
    );
  }
};

// Never throws: push is best-effort and must not affect the calling request.
export const sendPushToUsers = async (
  userIds: string[],
  payload: PushPayload,
  options: PushOptions = {},
): Promise<void> => {
  if (!isPushConfigured || userIds.length === 0) return;

  try {
    const subscriptions = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(inArray(pushSubscriptionsTable.userId, userIds));

    const body = JSON.stringify(payload);
    await Promise.all(
      subscriptions.map((subscription) =>
        sendToSubscription(subscription, body, options),
      ),
    );
  } catch (err) {
    log.error({ err }, "failed to dispatch notifications");
  }
};

export const sendPushToUser = (
  userId: string,
  payload: PushPayload,
  options?: PushOptions,
): Promise<void> => sendPushToUsers([userId], payload, options);
