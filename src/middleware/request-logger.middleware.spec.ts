import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("request logger", () => {
  it("assigns a fresh request id to every response", async () => {
    const first = await request(app).get("/");
    const second = await request(app).get("/");

    expect(first.headers["x-request-id"]).toMatch(UUID);
    expect(second.headers["x-request-id"]).toMatch(UUID);
    expect(first.headers["x-request-id"]).not.toBe(
      second.headers["x-request-id"],
    );
  });

  it("keeps a well-formed id sent by the caller", async () => {
    const res = await request(app).get("/").set("X-Request-Id", "web-abc_123");

    expect(res.headers["x-request-id"]).toBe("web-abc_123");
  });

  it("replaces a caller id that could inject into the log", async () => {
    const res = await request(app)
      .get("/")
      .set("X-Request-Id", '"} {"level":60,"msg":"forged');

    expect(res.headers["x-request-id"]).toMatch(UUID);
  });

  it("still assigns an id to unlogged health checks", async () => {
    const res = await request(app).get("/health");

    expect(res.headers["x-request-id"]).toMatch(UUID);
  });
});
