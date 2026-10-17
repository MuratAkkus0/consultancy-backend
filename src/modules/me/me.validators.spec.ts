import { describe, expect, it } from "vitest";
import {
  createPushSubscriptionSchema,
  deletePushSubscriptionSchema,
} from "./me.validators.js";

const valid = {
  endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
  expirationTime: null,
  keys: {
    p256dh:
      "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
    auth: "tBHItJI5svbpez7KI4CCXg",
  },
};

describe("createPushSubscriptionSchema", () => {
  it("accepts a PushSubscription.toJSON() payload", () => {
    expect(createPushSubscriptionSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a numeric or omitted expirationTime", () => {
    expect(
      createPushSubscriptionSchema.safeParse({
        ...valid,
        expirationTime: 1_900_000_000_000,
      }).success,
    ).toBe(true);

    const { expirationTime: _omitted, ...withoutExpiration } = valid;
    expect(
      createPushSubscriptionSchema.safeParse(withoutExpiration).success,
    ).toBe(true);
  });

  it("rejects a non-https or malformed endpoint", () => {
    for (const endpoint of ["http://push.example/x", "not a url", ""]) {
      expect(
        createPushSubscriptionSchema.safeParse({ ...valid, endpoint }).success,
      ).toBe(false);
    }
  });

  it("rejects an endpoint longer than 2048 characters", () => {
    const endpoint = `https://push.example/${"a".repeat(2048)}`;
    expect(
      createPushSubscriptionSchema.safeParse({ ...valid, endpoint }).success,
    ).toBe(false);
  });

  it("rejects missing or non-base64url keys", () => {
    expect(
      createPushSubscriptionSchema.safeParse({ endpoint: valid.endpoint })
        .success,
    ).toBe(false);
    expect(
      createPushSubscriptionSchema.safeParse({
        ...valid,
        keys: { ...valid.keys, auth: "not valid!" },
      }).success,
    ).toBe(false);
    expect(
      createPushSubscriptionSchema.safeParse({
        ...valid,
        keys: { ...valid.keys, p256dh: "a".repeat(257) },
      }).success,
    ).toBe(false);
  });

  it("rejects a non-integer or negative expirationTime", () => {
    for (const expirationTime of [-1, 1.5, "soon"]) {
      expect(
        createPushSubscriptionSchema.safeParse({ ...valid, expirationTime })
          .success,
      ).toBe(false);
    }
  });
});

describe("deletePushSubscriptionSchema", () => {
  it("requires an https endpoint", () => {
    expect(
      deletePushSubscriptionSchema.safeParse({ endpoint: valid.endpoint })
        .success,
    ).toBe(true);
    expect(deletePushSubscriptionSchema.safeParse({}).success).toBe(false);
    expect(
      deletePushSubscriptionSchema.safeParse({ endpoint: "http://x.test" })
        .success,
    ).toBe(false);
  });
});
