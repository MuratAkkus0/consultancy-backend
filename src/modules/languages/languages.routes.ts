import { Router } from "express";
import { requireAuth } from "../../middleware/index.js";
import { registerRoute } from "../../lib/openapi.js";
import { languagesController } from "./languages.controller.js";

const router = Router();

// List languages - any authenticated user (students need the list to pick
// their languages during onboarding).
registerRoute({
  method: "get",
  path: "/api/v1/languages",
  tags: ["Languages"],
  summary: "List languages",
  description: "The language vocabulary, ordered by name.",
  responses: {
    200: { description: "List of languages" },
    401: { description: "Not authenticated" },
  },
});
router.get("/", requireAuth, languagesController.list);

export default router;
