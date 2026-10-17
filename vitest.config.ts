import { defineConfig, configDefaults } from "vitest/config";
import { config } from "dotenv";

config();

export default defineConfig({
  test: {
    environment: "node",
    // Build output and agent worktrees contain copies of the specs.
    exclude: [...configDefaults.exclude, "dist/**", ".claude/**"],
  },
});
