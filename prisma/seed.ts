import { readFileSync, statSync } from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { parse } from "csv-parse/sync";
import { PrismaClient, type PostType } from "@prisma/client";
import { mapFormat, parseSlides } from "../lib/posts";
import { parseClock, zonedDateTime } from "../lib/time";

const prisma = new PrismaClient();

const MOCKUPS: Record<string, { file: string; alt: string }> = {
  "2026-10-12": { file: "q1_mark16-15.jpg", alt: "No. 01 The Great Commission, Mark 16:15" },
  "2026-10-19": { file: "q2_john16-33.jpg", alt: "No. 02 Take Heart, John 16:33" },
  "2026-10-26": { file: "q4_rom10-14.jpg", alt: "No. 04 Until All Have Heard, Romans 10:14" },
  "2026-11-02": { file: "q5_mark10-45.jpg", alt: "No. 05 Local Servant, Mark 10:45" },
  "2026-11-09": { file: "q3_rev22-20.jpg", alt: "No. 03 Maranatha, Revelation 22:20" },
};

type Row = {
  date: string;
  time_ct: string;
  format: string;
  pillar: string;
  product_tie: string;
  title: string;
  quote_text_exact: string;
  attribution: string;
  visual_layout_type: string;
  palette_hex: string;
  reel_script_or_slides: string;
  caption: string;
  hashtags: string;
  cta: string;
  asset_status: string;
};

async function main() {
  const email = (process.env.SEED_OWNER_EMAIL || "mike@preachthegospel.store").toLowerCase();
  const name = process.env.SEED_OWNER_NAME || "Mike";
  const password = process.env.SEED_OWNER_PASSWORD || "ptg-local-2026";
  const passwordHash = await bcrypt.hash(password, 10);

  const owner = await prisma.user.upsert({
    where: { email },
    update: { name },
    create: { email, name, passwordHash, role: "OWNER" },
  });

  const csvPath = path.join(process.cwd(), "data", "plan.csv");
  const rows = parse(readFileSync(csvPath), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    bom: true,
  }) as Row[];

  if (rows.length !== 22) {
    throw new Error(`Expected 22 plan rows, found ${rows.length}.`);
  }

  for (const [index, row] of rows.entries()) {
    const planNumber = index + 1;
    const postType: PostType = mapFormat(row.format);
    const scheduledAt = zonedDateTime(row.date, parseClock(row.time_ct));
    const slides = postType === "CAROUSEL" ? parseSlides(row.reel_script_or_slides || "") : [];
    const content = {
      title: row.title.trim(),
      caption: (row.caption || "").trim(),
      hashtags: (row.hashtags || "").trim(),
      postType,
      scheduledAt,
      bibleReference: (row.attribution || "").trim(),
      quoteText: (row.quote_text_exact || "").trim(),
      pillar: (row.pillar || "").trim(),
      productTie: (row.product_tie || "").trim(),
      visualDirection: (row.visual_layout_type || "").trim(),
      palette: (row.palette_hex || "").trim(),
      productionNotes: (row.reel_script_or_slides || "").trim(),
      cta: (row.cta || "").trim(),
      assetStatus: (row.asset_status || "").trim(),
      timezone: "America/Chicago",
    };

    const existing = await prisma.post.findUnique({ where: { planNumber } });
    const post =
      existing && existing.status !== "DRAFT"
        ? existing
        : existing
          ? await prisma.post.update({
              where: { id: existing.id },
              data: content,
            })
          : await prisma.post.create({
              data: { ...content, planNumber, status: "DRAFT", createdById: owner.id },
            });

    if (!existing || existing.status === "DRAFT") {
      await prisma.slide.deleteMany({ where: { postId: post.id } });
      if (slides.length) {
        await prisma.slide.createMany({
          data: slides.map((slide, position) => ({
            postId: post.id,
            position,
            heading: slide.heading,
            body: slide.body,
          })),
        });
      }
    }

    const mock = MOCKUPS[row.date];
    if (!mock) continue;
    const filePath = path.join(process.cwd(), "public", "seed", mock.file);
    let size = 0;
    try {
      size = statSync(filePath).size;
    } catch {
      console.warn(`Missing mockup ${mock.file}. Post ${planNumber} was saved without an asset.`);
      continue;
    }
    const pathname = `seed/${mock.file}`;
    const asset = await prisma.asset.upsert({
      where: { pathname },
      update: { alt: mock.alt, size },
      create: {
        filename: mock.file,
        mimeType: "image/jpeg",
        size,
        url: `/seed/${mock.file}`,
        pathname,
        storage: "seed",
        width: 1080,
        height: 1350,
        alt: mock.alt,
        createdById: owner.id,
      },
    });
    const link = await prisma.postAsset.findUnique({
      where: { postId_assetId: { postId: post.id, assetId: asset.id } },
    });
    if (!link) {
      const count = await prisma.postAsset.count({ where: { postId: post.id } });
      await prisma.postAsset.create({
        data: { postId: post.id, assetId: asset.id, position: count },
      });
    }
  }

  const templates = [
    {
      name: "First-order closer",
      body: "Made to order for you. Link in bio. New here? Join the list for 15% off your first order.",
    },
    {
      name: "Made to order",
      body: "Every piece is made to order after you check out, then shipped in 14–21 days. Order early if it's a gift.",
    },
  ];
  for (const template of templates) {
    const found = await prisma.captionTemplate.findFirst({ where: { name: template.name } });
    if (!found) {
      await prisma.captionTemplate.create({ data: { ...template, createdById: owner.id } });
    }
  }

  const sets = [
    { name: "Always on", tags: "#preachthegospel #christianstreetwear #wearyourfaith #faithapparel" },
    { name: "Mission", tags: "#greatcommission #sharethegospel #bibleverse" },
    { name: "El Movimiento", tags: "#elmovimiento #ropacristiana #predicaelevangelio" },
    { name: "Houston", tags: "#htx #houstonfashion #shopsmall" },
  ];
  for (const set of sets) {
    const found = await prisma.hashtagSet.findFirst({ where: { name: set.name } });
    if (!found) await prisma.hashtagSet.create({ data: { ...set, createdById: owner.id } });
  }

  const already = await prisma.activity.findFirst({ where: { action: "seed.plan" } });
  if (!already) {
    await prisma.activity.create({
      data: {
        userId: owner.id,
        action: "seed.plan",
        entityType: "post",
        detail: `${name} imported the 30-day plan as 22 drafts. Nothing is scheduled to publish.`,
      },
    });
  }

  console.log(`Seeded ${rows.length} drafts for ${email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
