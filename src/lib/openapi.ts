import { z } from "zod";

/**
 * A single API endpoint's documentation, declared next to its route but
 * powered entirely by the Zod schemas you already validate with.
 * There is only one source of truth: the Zod schema. Change the validator
 * and the docs change with it.
 */
export interface RouteDoc {
  method: "get" | "post" | "put" | "patch" | "delete";
  /** Express-style path is fine, e.g. "/api/v1/students/:id" */
  path: string;
  tags?: string[];
  summary?: string;
  description?: string;
  /** Set true for endpoints that don't require a session. */
  isPublic?: boolean;
  request?: {
    params?: z.ZodType;
    query?: z.ZodType;
    body?: z.ZodType;
  };
  responses: Record<number, { description: string; schema?: z.ZodType }>;
}

const routes: RouteDoc[] = [];

/** Called from each *.routes.ts file to register its endpoints. */
export function registerRoute(doc: RouteDoc): void {
  routes.push(doc);
}

// "input" = the shape the client sends (defaulted/optional fields stay
// optional). "output" = the shape the server returns (after defaults/transforms).
const toSchema = (s: z.ZodType, io: "input" | "output") =>
  z.toJSONSchema(s, {
    target: "openapi-3.0",
    io,
    // Don't throw on types JSON Schema can't express (e.g. z.date()); emit a
    // permissive schema instead so one field never crashes the whole document.
    unrepresentable: "any",
    override: (ctx) => {
      // Represent z.date() as an ISO date-time string in the docs.
      if (ctx.zodSchema?._zod?.def?.type === "date") {
        ctx.jsonSchema.type = "string";
        ctx.jsonSchema.format = "date-time";
      }
    },
  }) as Record<string, unknown>;

/** Express ":id" -> OpenAPI "{id}". */
const toOpenApiPath = (p: string) => p.replace(/:([A-Za-z0-9_]+)/g, "{$1}");

/** Explode a Zod object into individual OpenAPI path/query parameters. */
function parametersFrom(
  schema: z.ZodType | undefined,
  location: "path" | "query",
) {
  if (!schema) return [];
  const json = toSchema(schema, "input") as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  const required = json.required ?? [];
  return Object.entries(json.properties ?? {}).map(([name, sch]) => ({
    name,
    in: location,
    required: location === "path" ? true : required.includes(name),
    schema: sch,
  }));
}

/**
 * Assemble the full OpenAPI document from everything registered so far.
 * Call this AFTER all route modules have been imported (they self-register
 * on import), which app.ts guarantees.
 */
export function buildOpenApiDocument() {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const r of routes) {
    const p = toOpenApiPath(r.path);
    paths[p] ??= {};

    const parameters = [
      ...parametersFrom(r.request?.params, "path"),
      ...parametersFrom(r.request?.query, "query"),
    ];

    const responses: Record<string, unknown> = {};
    for (const [code, res] of Object.entries(r.responses)) {
      responses[code] = {
        description: res.description,
        ...(res.schema
          ? {
              content: {
                "application/json": { schema: toSchema(res.schema, "output") },
              },
            }
          : {}),
      };
    }

    paths[p][r.method] = {
      ...(r.tags ? { tags: r.tags } : {}),
      ...(r.summary ? { summary: r.summary } : {}),
      ...(r.description ? { description: r.description } : {}),
      ...(parameters.length ? { parameters } : {}),
      ...(r.request?.body
        ? {
            requestBody: {
              required: true,
              content: {
                "application/json": { schema: toSchema(r.request.body, "input") },
              },
            },
          }
        : {}),
      responses,
      // Opt an endpoint out of the global cookie-auth requirement.
      ...(r.isPublic ? { security: [] } : {}),
    };
  }

  return {
    openapi: "3.0.0",
    info: {
      title: "Milestonegermany API's",
      version: "1.0.0",
      description: "Milestonegermany backend app",
    },
    // Relative URL: "Try it out" requests target whatever origin the docs are
    // served from — localhost in dev, the Railway domain in prod. Always
    // same-origin, so CORS and mixed-content never come into play.
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "better-auth.session_token",
        },
      },
    },
    security: [{ cookieAuth: [] }],
    paths,
  };
}
