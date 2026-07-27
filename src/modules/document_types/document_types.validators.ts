import z from "zod";

// `code` is the stable machine name: lowercase snake_case, unique, and
// immutable after creation — renaming a label is `name`'s job.
export const createDocumentTypeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[a-z][a-z0-9_]*$/, {
      message: "code must be lowercase snake_case (e.g. language_certificate)",
    }),
  name: z.string().trim().min(1).max(100),
});

// Only the human label is editable; code is identity.
export const editDocumentTypeSchema = z.object({
  name: z.string().trim().min(1).max(100),
});
