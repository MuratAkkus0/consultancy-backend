# Consultancy Backend

REST API for an education-consultancy platform: prospective students register, are matched
with a consultant, upload the documents their target country and course require, book
appointments, and have their applications and payments tracked through to a decision.

TypeScript on Express, Drizzle ORM over PostgreSQL, session auth via better-auth, and
S3-compatible object storage for documents.

## Domain

Three roles, with distinct views of the same data:

| Role | What they can do |
| --- | --- |
| `student` | Complete onboarding, upload required documents, view their own applications, appointments and payments |
| `consultant` | See only the students assigned to them, review their documents, manage their appointments and applications |
| `admin` | Manage consultants, assignments, courses, countries, languages and document types |

The core flow: a student completes **onboarding** → an **assignment** links them to a
consultant → the student's target countries and courses determine which
**required documents** apply → the student uploads **documents** → the consultant works the
**application** through its lifecycle, scheduling **appointments** and recording
**payments** along the way.

## Architecture

Module-per-feature. Each module owns its routes, controller and schema, so a feature can be
read end to end in one directory rather than traced across layer folders:

```
src/
  modules/<feature>/
    <feature>.routes.ts       HTTP wiring
    <feature>.controller.ts   request/response handling
    <feature>.schema.ts       zod contracts
  db/
    schema/                   Drizzle table definitions
    migrations/               generated SQL migrations
  middleware/
    auth.middleware.ts        resolves the better-auth session
    role.middleware.ts        role gate (admin / consultant / student)
    ownership.middleware.ts   record-level ownership check
    validate.middleware.ts    zod request validation
    rate-limit.middleware.ts
  lib/storage.ts              S3 uploads and presigned download URLs
  config/                     environment loading and validation
```

Modules: `onboarding`, `students`, `consultants`, `assignments`, `courses`, `payments`,
`applications`, `appointments`, `documents`, `document_types`, `languages`, `countries`,
`required_documents`, `me`.

### Authorization is two-layered

A role check alone is not enough here — a consultant is allowed to read *a* student, but not
*every* student. So `role.middleware` answers "is this kind of user allowed to call this
endpoint at all", and `ownership.middleware` then answers "does this specific record belong
to them, or to a student assigned to them". Both have to pass.

### Appointments cannot double-book a consultant

Two clients booking the same consultant for overlapping windows is the one place in this API
where a naive check-then-insert would silently corrupt the schedule. So the booking path
takes a `FOR UPDATE` lock on the consultant row before calling `assertNoOverlap`, which
serialises concurrent bookings for that consultant rather than letting both pass the check.
A unique index on the consultant's exact slot backs that up at the database level, and the
same rule is re-applied on reschedule against the *final* `(consultant, start, duration)`,
not the original one.

### Documents are never served directly

Uploads go to S3-compatible storage; the API returns short-lived presigned URLs rather than
proxying file bytes. Deletions are queued in `s3_deletion_queues` instead of being issued
inline, so a failed remote delete can be retried without leaving an orphaned database row.

### Consent is recorded, not assumed

`user_consents` stores what a user agreed to and when, rather than treating acceptance as an
implicit side effect of registration.

## Stack

- **Runtime** Node.js 24, TypeScript, Express
- **Database** PostgreSQL with Drizzle ORM; SQL migrations are generated, not hand-written
- **Auth** better-auth with the Drizzle adapter, session-based
- **Storage** AWS S3 SDK with presigned URLs
- **Validation** zod on every request body
- **Docs** OpenAPI served at `/swagger-ui`
- **Hardening** CORS allowlist, `express-rate-limit` (stricter on the auth routes than on the
  rest of the API), a 100 kB JSON body cap, and a central error handler

## Local setup

Requires Node 24 (see `.nvmrc`) and Docker for PostgreSQL.

```bash
cp .env.example .env        # then fill in the blanks
npm install
docker compose up -d db     # PostgreSQL on the port from DATABASE_URL
npm run db:migrate
npm run seed:languages
npm run seed:admin          # uses SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
npm run dev
```

API docs are then at `http://localhost:<APP_PORT>/swagger-ui`.

### Environment

`.env.example` lists every variable. The ones without defaults must be set:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL`, `POSTGRES_DB`, `POSTGRES_PASSWORD` | PostgreSQL connection |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Token signing |
| `ALLOWED_ORIGIN` | CORS allowlist |
| `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX` | Rate limiting |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Outbound mail |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | First admin account |

S3 credentials are read from the standard AWS environment variables.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with reload |
| `npm run build` / `npm start` | Compile and run |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run db:generate` | Generate a migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run db:studio` | Drizzle Studio |
| `npm run seed:admin` / `npm run seed:languages` | Seed data |

`husky` runs lint on pre-commit and typecheck on pre-push; CI repeats both on every push.

## Roadmap

This project is still under active development. The following are planned rather than done:

- **Test suite.** Vitest and supertest are already wired up. The first areas to cover are the
  authorization rules — a consultant must not reach a student who is not assigned to them, a
  student must not reach another student's documents — and the appointment overlap guard
  under concurrency.
- **Scheduling the S3 deletion worker.** The worker itself exists
  (`src/modules/documents/s3_deletion_worker.service.ts`); it still needs to be run on a
  schedule so the deletion queue is drained rather than only filled.
- **Containerising the API.** Only the database is in `compose.yaml` today; the API runs on
  the host.
