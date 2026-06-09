import express from "express";
const app = express();

app.use(express.json({ limit: "100kb" }));

app.get("/health", (_req, res) => {
  res.send("ok").status(200);
});

app.get("/", (_req, res) => {
  res.send("Hello World!");
});

export { app };
