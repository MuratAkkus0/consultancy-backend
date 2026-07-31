import { Router } from "express";
import { requireAuth } from "../../middleware/index.js";
import { registerRoute } from "../../lib/openapi.js";
import { countriesController } from "./countries.controller.js";

const router = Router();

// List active countries - any authenticated user (students need the list to
// pick their target countries during onboarding).
registerRoute({
  method: "get",
  path: "/api/v1/countries",
  tags: ["Countries"],
  summary: "List countries",
  description: "The active country vocabulary, ordered by Turkish name.",
  responses: {
    200: { description: "List of countries" },
    401: { description: "Not authenticated" },
  },
});
router.get("/", requireAuth, countriesController.list);

export default router;
