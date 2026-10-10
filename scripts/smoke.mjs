import { mkdir, writeFile } from "fs/promises";
import path from "path";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const base = process.env.APP_URL || "http://127.0.0.1:3847";
const out = "/tmp/ptg-shots";
await mkdir(out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/opt/google/chrome/chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1100 });

const failures = [];
function check(name, ok, detail = "") {
  console.log(`${ok ? "OK" : "FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures.push(name + (detail ? ": " + detail : ""));
}

await page.goto(`${base}/login`, { waitUntil: "networkidle0" });
check("login page", (await page.content()).includes("Enter the desk"));
await page.type('input[name="email"]', "mike@preachthegospel.store");
await page.type('input[name="password"]', "ptg-local-2026");
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle0", timeout: 30000 }),
  page.click('button[type="submit"]'),
]);
check("logged in", page.url().endsWith("/") || page.url() === `${base}/`, page.url());
await page.screenshot({ path: path.join(out, "desk.png"), fullPage: true });

await page.goto(`${base}/calendar?view=month&month=2026-10`, { waitUntil: "networkidle0" });
const titles = await page.$$eval("[data-post-id]", (nodes) => nodes.map((node) => node.textContent || ""));
check("calendar has plan", titles.some((text) => text.includes("Great Commission")), String(titles.length));
await page.screenshot({ path: path.join(out, "calendar.png"), fullPage: true });

const chip = await page.$("[data-post-id]");
const day = await page.$('[data-date="2026-10-14"]');
if (chip && day) {
  const from = await chip.boundingBox();
  const to = await day.boundingBox();
  const id = await page.evaluate((el) => el.getAttribute("data-post-id"), chip);
  await page.mouse.move(from.x + 20, from.y + 16);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + 40, { steps: 18 });
  await page.mouse.up();
  await page.waitForFunction(
    (postId) => {
      const node = document.querySelector(`[data-date="2026-10-14"] [data-post-id="${postId}"]`);
      return Boolean(node);
    },
    { timeout: 8000 },
    id,
  ).catch(() => null);
  const moved = await page.$(`[data-date="2026-10-14"] [data-post-id="${id}"]`);
  check("drag reschedule", Boolean(moved), id || "");
  await page.screenshot({ path: path.join(out, "calendar-after-drag.png"), fullPage: false });
} else {
  check("drag reschedule", false, "missing chip or day");
}

await page.goto(`${base}/posts`, { waitUntil: "networkidle0" });
const href = await page.$eval('table a[href^="/posts/"]', (node) => node.getAttribute("href"));
await page.goto(`${base}${href}`, { waitUntil: "networkidle0" });
check("editor", (await page.content()).includes("Mark 16:15"), page.url());
await page.screenshot({ path: path.join(out, "editor.png"), fullPage: true });

async function clickButton(label) {
  const clicked = await page.evaluate((text) => {
    const button = [...document.querySelectorAll("button")].find((node) => node.textContent?.includes(text));
    if (!button) return false;
    button.click();
    return true;
  }, label);
  return clicked;
}

await page.goto(`${base}/posts/new`, { waitUntil: "networkidle0" });
const titleInput = await page.$("section input");
await titleInput.click();
await titleInput.type("Smoke test post");
check("create click", await clickButton("Create draft"));
await page.waitForFunction(() => location.pathname.startsWith("/posts/") && !location.pathname.endsWith("/new"), { timeout: 15000 }).catch(() => null);
if (!page.url().includes("/posts/") || page.url().endsWith("/new")) {
  console.log("CREATE BODY", (await page.evaluate(() => document.body.innerText)).slice(0, 500));
}
check("create post", /\/posts\/(?!new)/.test(new URL(page.url()).pathname), page.url());

await page.goto(`${base}/team`, { waitUntil: "networkidle0" });
await page.type('input[name="name"]', "Jordan Editor");
await page.type('input[name="email"]', "jordan@preachthegospel.store");
await page.select('select[name="role"]', "EDITOR");
check("add click", await clickButton("Add person"));
await page.waitForFunction(() => document.body.innerText.includes("temporary password"), { timeout: 10000 }).catch(() => null);
check("add user", (await page.content()).includes("jordan@preachthegospel.store") && (await page.content()).includes("temporary password"));
await page.screenshot({ path: path.join(out, "team.png"), fullPage: true });

const png = await sharp({
  create: { width: 32, height: 32, channels: 3, background: { r: 224, g: 31, b: 38 } },
}).png().toBuffer();
await writeFile("/tmp/ptg-upload.png", png);
await page.goto(`${base}/library`, { waitUntil: "networkidle0" });
const fileInput = await page.$('input[type="file"]');
await fileInput.uploadFile("/tmp/ptg-upload.png");
await page.waitForFunction(() => document.body.innerText.includes("ptg-upload.png"), { timeout: 10000 }).catch(() => null);
check("upload asset", (await page.content()).includes("ptg-upload.png"));
await page.screenshot({ path: path.join(out, "library.png"), fullPage: true });

await page.goto(`${base}/calendar?view=week&week=2026-10-12&month=2026-10`, { waitUntil: "networkidle0" });
check("week view", (await page.content()).includes("Oct 12"));
await page.goto(`${base}/calendar?view=list&month=2026-10`, { waitUntil: "networkidle0" });
check("list view", (await page.content()).includes("Great Commission"));
await page.goto(`${base}/calendar?view=grid&month=2026-10`, { waitUntil: "networkidle0" });
check("grid view", (await page.content()).includes("preachthegospel.store"));
await page.screenshot({ path: path.join(out, "grid.png"), fullPage: false });

console.log(failures.length ? `FAILED ${failures.length}` : "ALL PASSED");
await browser.close();
process.exit(failures.length ? 1 : 0);
