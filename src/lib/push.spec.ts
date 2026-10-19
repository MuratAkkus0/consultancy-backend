import { afterEach, describe, expect, it, vi } from "vitest";

const payload = {
  title: "Yeni mesajınız var",
  body: "Ayşe size bir mesaj gönderdi.",
  url: "/dashboard/messages",
  tag: "conversation:1",
};

const subscription = {
  id: "sub-1",
  userId: "user-1",
  endpoint: "https://push.example/abc",
  p256dh: "p256dh-key",
  auth: "auth-key",
};

const mockLogger = () => {
  const log = { warn: vi.fn(), error: vi.fn() };
  vi.doMock("./logger.js", () => ({ logger: { child: () => log } }));
  return log;
};

const loadPush = async (vapid: Record<string, string | undefined>) => {
  vi.resetModules();

  const log = mockLogger();
  const sendNotification = vi.fn();
  const setVapidDetails = vi.fn();
  const deleteWhere = vi.fn(() => Promise.resolve());
  const selectWhere = vi.fn(() => Promise.resolve([subscription]));

  vi.doMock("web-push", () => ({
    default: { sendNotification, setVapidDetails },
  }));
  vi.doMock("../config/env.js", () => ({ env: vapid }));
  vi.doMock("../db/index.js", () => ({
    db: {
      select: () => ({ from: () => ({ where: selectWhere }) }),
      delete: () => ({ where: deleteWhere }),
    },
    pushSubscriptionsTable: {
      id: "id",
      userId: "user_id",
    },
  }));

  const push = await import("./push.js");
  return {
    push,
    log,
    sendNotification,
    setVapidDetails,
    deleteWhere,
    selectWhere,
  };
};

const configured = {
  VAPID_PUBLIC_KEY: "public",
  VAPID_PRIVATE_KEY: "private",
  VAPID_SUBJECT: "mailto:ops@example.com",
};

describe("push", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock("./logger.js");
    vi.doUnmock("web-push");
    vi.doUnmock("../config/env.js");
    vi.doUnmock("../db/index.js");
  });

  it("is a no-op when VAPID is not configured", async () => {
    const { push, sendNotification, selectWhere } = await loadPush({});

    expect(push.isPushConfigured).toBe(false);
    await push.sendPushToUser("user-1", payload);

    expect(selectWhere).not.toHaveBeenCalled();
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("stays disabled when the VAPID keys are invalid", async () => {
    vi.resetModules();
    const log = mockLogger();
    const setVapidDetails = vi.fn(() => {
      throw new Error("bad key");
    });
    vi.doMock("web-push", () => ({
      default: { sendNotification: vi.fn(), setVapidDetails },
    }));
    vi.doMock("../config/env.js", () => ({ env: configured }));
    vi.doMock("../db/index.js", () => ({
      db: {},
      pushSubscriptionsTable: {},
    }));

    const push = await import("./push.js");

    expect(push.isPushConfigured).toBe(false);
    expect(log.error).toHaveBeenCalled();
  });

  it("sends the JSON payload with a TTL and urgency", async () => {
    const { push, sendNotification } = await loadPush(configured);
    sendNotification.mockResolvedValue({});

    await push.sendPushToUser("user-1", payload, { urgency: "high" });

    expect(sendNotification).toHaveBeenCalledWith(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { TTL: 86_400, urgency: "high" },
    );
  });

  it.each([404, 410])(
    "deletes the subscription when the push service answers %i",
    async (statusCode) => {
      const { push, sendNotification, deleteWhere } =
        await loadPush(configured);
      sendNotification.mockRejectedValue(
        Object.assign(new Error("gone"), { statusCode }),
      );

      await expect(
        push.sendPushToUser("user-1", payload),
      ).resolves.toBeUndefined();

      expect(deleteWhere).toHaveBeenCalledTimes(1);
    },
  );

  it("logs other errors without deleting or throwing", async () => {
    const { push, log, sendNotification, deleteWhere } =
      await loadPush(configured);
    sendNotification.mockRejectedValue(
      Object.assign(new Error("server error"), { statusCode: 500 }),
    );

    await expect(
      push.sendPushToUser("user-1", payload),
    ).resolves.toBeUndefined();

    expect(deleteWhere).not.toHaveBeenCalled();
    expect(log.error).toHaveBeenCalled();
  });

  it("never throws when loading subscriptions fails", async () => {
    const { push, log, selectWhere } = await loadPush(configured);
    selectWhere.mockRejectedValue(new Error("db down"));

    await expect(
      push.sendPushToUser("user-1", payload),
    ).resolves.toBeUndefined();

    expect(log.error).toHaveBeenCalled();
  });

  it("skips the lookup for an empty recipient list", async () => {
    const { push, selectWhere } = await loadPush(configured);

    await push.sendPushToUsers([], payload);

    expect(selectWhere).not.toHaveBeenCalled();
  });
});
