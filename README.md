# PTG Social Desk

Editorial calendar for [Preach the Gospel](https://preachthegospel.store) (`@preachthegospel.store`). Draft posts, approve them, and publish to Instagram on a schedule. Times are America/Chicago. Nothing is sent to Instagram unless an owner or admin has approved it and the status is **Scheduled**.

## Stack

- Next.js App Router, TypeScript
- Postgres (Neon or Vercel Postgres) via Prisma
- Auth.js credentials (email and password)
- Vercel Blob for uploads
- Vercel Cron for publishing

## Local setup

Postgres 16 is required. Either use the included Compose file or a local install.

```bash
docker compose up -d
cp .env.example .env
# Fill AUTH_SECRET and CRON_SECRET. The example DATABASE_URL matches Compose.
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

The seed creates one owner. With the passwords from `.env.example` you should change them. A local `.env` copied from the example and given `SHOW_DEMO_LOGIN=true` prints the seed login on the sign-in screen. The development database for this repo uses:

- Email: `mike@preachthegospel.store`
- Password: value of `SEED_OWNER_PASSWORD` (local default `ptg-local-2026`)

Seed loads `data/plan.csv` (22 drafts, Mon Oct 12 through Tue Nov 10, 2026) and attaches the five quote cards in `public/seed/` to the matching posts. Re-running the seed refreshes drafts and leaves anything already in review, approved, scheduled, or published alone.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3847 |
| `npm run build` | `prisma generate`, `prisma migrate deploy`, `next build` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Import the plan, quote cards, templates, and hashtag sets |
| `npm test` | Timezone, caption, and approval-gate tests |
| `npm run posters` | Re-render the five quote cards (needs Chrome) |

## Environment variables

Every variable the app reads is listed here and in `.env.example`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Pooled Postgres URL. On Vercel/Neon this is `POSTGRES_PRISMA_URL`. Copy that value into `DATABASE_URL`. |
| `DIRECT_URL` | Yes | Direct Postgres URL used by Prisma migrations. On Vercel/Neon this is `POSTGRES_URL_NON_POOLING`. |
| `AUTH_SECRET` | Yes | Auth.js signing secret. `openssl rand -base64 32` |
| `AUTH_URL` | Yes | Public origin, no trailing slash. Local `http://127.0.0.1:3847`. Production `https://your-app.vercel.app`. |
| `CRON_SECRET` | Yes for cron | Vercel sends `Authorization: Bearer <CRON_SECRET>` to `/api/cron/publish`. |
| `BLOB_READ_WRITE_TOKEN` | Yes on Vercel | Vercel Blob token. Empty locally: uploads go to `public/uploads` and Instagram cannot fetch them. |
| `META_APP_ID` | For Instagram | Meta app id. Empty: the desk works, Connect Instagram does not. |
| `META_APP_SECRET` | For Instagram | Meta app secret. |
| `META_REDIRECT_URI` | No | Defaults to `${AUTH_URL}/api/instagram/callback`. Must match the Meta app exactly. |
| `META_GRAPH_VERSION` | No | Defaults to `v22.0`. |
| `INSTAGRAM_USERNAME` | No | Defaults to `preachthegospel.store`. Used to pick the right Page when Facebook returns more than one. |
| `INSTAGRAM_PUBLISH_MODE` | No | `live` (default) calls the Graph API. `dry-run` logs the attempt and leaves the post scheduled. |
| `SEED_OWNER_EMAIL` | For seed | Default `mike@preachthegospel.store`. |
| `SEED_OWNER_NAME` | For seed | Default `Mike`. |
| `SEED_OWNER_PASSWORD` | For seed | Password set only when that owner is first created. |
| `SHOW_DEMO_LOGIN` | No | `true` prints the seed email and password on the login page. Leave `false` in production. |

## Roles

| Role | Can |
| --- | --- |
| Owner | Everything, including assigning another owner |
| Admin | Edit, approve, schedule, publish, add editors and viewers. Cannot create or remove an owner. |
| Editor | Draft and edit posts, upload media, comment. Cannot approve or publish. |
| Viewer | Read the calendar, posts, library, and insights. |

Editing the copy, hashtags, or media of an approved or scheduled post sends it back to **In review** and clears the approval.

## Publish rules

The cron (and the **Publish due posts** button) will call Instagram only when all of these are true:

1. Status is **Scheduled**
2. `approvedBy` is an owner or admin
3. `scheduledAt` is in the past (stored in UTC, edited as America/Chicago)
4. Instagram is connected
5. `INSTAGRAM_PUBLISH_MODE` is not `dry-run`
6. The post has a public `https` image (JPEG, or a PNG the publisher converts with Blob) or an MP4 for a Reel. Carousels need 2–10 images.
7. Caption is at most 2,200 characters and at most 30 hashtags

Approved alone does not publish. Use **Approve and schedule**.

Vercel Cron is `*/5 * * * *` in `vercel.json`. Hobby plans only allow a daily cron, so use Pro for five-minute checks, or use **Publish due posts** on the Instagram page.

## Deploy on Vercel

1. Push this repo to GitHub (or the Git host Vercel is using).
2. In the Vercel dashboard, **Add New Project** and import the repo. Framework preset: Next.js. Root directory: the repo root.
3. Create a Postgres database. Either:
   - Storage → Neon / Vercel Postgres, or
   - A Neon project you already have.
4. Copy the connection strings into project environment variables (Production and Preview):
   - `DATABASE_URL` = pooled URL (`POSTGRES_PRISMA_URL` if Vercel created the database)
   - `DIRECT_URL` = non-pooling URL (`POSTGRES_URL_NON_POOLING`)
5. Storage → Blob → create a store and connect it to the project. Copy the token into `BLOB_READ_WRITE_TOKEN`.
6. Set the rest of the variables from the table above. `AUTH_URL` must be the production origin, for example `https://ptg-social.vercel.app`. `META_REDIRECT_URI` should be `https://ptg-social.vercel.app/api/instagram/callback` once you know the domain.
7. Deploy. The build command in `package.json` is `prisma generate && prisma migrate deploy && next build`, so the schema is applied during the build. The database must be reachable from Vercel's builders.
8. Seed production once, from your machine, with the production URLs exported:

```bash
DATABASE_URL="postgres://...pooler..." \
DIRECT_URL="postgres://...direct..." \
SEED_OWNER_EMAIL="mike@preachthegospel.store" \
SEED_OWNER_PASSWORD="a-long-password" \
npx prisma db seed
```

9. Sign in, open **Team**, and add editors. Turn `SHOW_DEMO_LOGIN` off.
10. Finish the Meta setup below, then **Instagram → Connect Instagram**.

## Meta app setup

This is the part that does **not** work until you create a Meta app. The desk, calendar, editor, uploads, and approval flow do not need it.

1. Go to [developers.facebook.com](https://developers.facebook.com/) → **My Apps** → **Create App** → type **Business**.
2. Add products:
   - **Facebook Login for Business** (or Facebook Login)
   - **Instagram** (Instagram API with Facebook Login / Instagram Graph API)
3. Facebook Login → Settings → **Valid OAuth Redirect URIs**. Add exactly:
   - `https://<your-domain>/api/instagram/callback`
   - `http://127.0.0.1:3847/api/instagram/callback` if you test the OAuth dance locally
4. Settings → Basic: copy **App ID** into `META_APP_ID` and **App secret** into `META_APP_SECRET`. Set `META_REDIRECT_URI` to the same callback URL.
5. App Review → Permissions and features. Request, and for a live app get Advanced Access for:
   - `instagram_basic`
   - `instagram_content_publish`
   - `instagram_manage_insights`
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_read_user_content`
   - `business_management`
6. In the Instagram professional dashboard, switch `@preachthegospel.store` to a **Business or Creator** account and link it to a Facebook Page you admin.
7. While the Meta app is in **Development** mode, only people listed as admin, developer, or tester can complete Facebook Login. Add the Facebook user that admins the Page.
8. Redeploy or restart so the env vars load. In the desk, open **Settings** and choose **Connect Instagram**. The callback stores the Page token encrypted with `AUTH_SECRET`.
9. Put a JPEG (or PNG, which is converted if Blob is configured) on an approved post, set a time a few minutes ahead, **Approve and schedule**. When the time passes, the cron publishes it. **Publish due posts** runs the same function immediately.
10. **Insights** reads followers plus recent media likes, comments, reach, saves, shares, and views. Reach and saves need `instagram_manage_insights`. If a metric is rejected, the row still shows likes and comments.

Media URLs must be public `https` links. Vercel Blob provides those. Files in `public/uploads` or `public/seed` are fine for the desk preview and will fail at publish time with a message that says so, until you re-upload them with Blob configured.

Reels must be `video/mp4`. Carousels are 2–10 images, published as a Graph API carousel. Single quote cards, photos, and engagement posts publish as image posts. The caption sent to Instagram is the caption plus the hashtag field.

## What is included

- Month, week, and list calendars, plus an Instagram-style grid preview. Drag a post onto a day to change the date and keep the Central time. Drop it on Unscheduled to clear the date.
- Post editor: caption, hashtag counter (2,200 / 30), type, Chicago date and time, status, notes, Bible reference, quote, visual direction, reel script, carousel slides, comments, duplicate, delete.
- Approval: submit for review, approve, approve and schedule, request changes, retry a failed publish.
- Media library and per-post upload. Blob when `BLOB_READ_WRITE_TOKEN` is set, otherwise local disk.
- Users, caption templates, hashtag sets, activity log.
- Instagram OAuth, container create + publish for images, carousels, and Reels, and a cron route.

## What still needs credentials

- `META_APP_ID` and `META_APP_SECRET`, the redirect URI, a professional Instagram account linked to a Facebook Page, and (for accounts outside the app's testers) Meta App Review.
- `BLOB_READ_WRITE_TOKEN` before a real publish, so Meta can download the file.
- `CRON_SECRET` on Vercel, and a plan that allows the five-minute cron if you want posts to go out without pressing the button.
- Production `DATABASE_URL`, `DIRECT_URL`, and `AUTH_SECRET`.
