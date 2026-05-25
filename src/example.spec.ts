import { expect, test } from "vitest";
import request from "supertest";
import { app } from "./app.js";

const sum = (a: number, b: number) => {
  return a + b;
};

test("adds 1 + 2 to equal 3", () => {
  expect(sum(1, 2)).toBe(3);
});

request(app)
  .get("/")
  .then((res) => {
    expect(res.text).toBe("Hello World!");
  });
