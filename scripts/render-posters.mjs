import { mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import puppeteer from "puppeteer-core";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = path.join(root, "scripts", "posters.html");
const outDir = path.join(root, "public", "seed");
const ids = ["q1", "q2", "q3", "q4", "q5"];
const names = {
  q1: "q1_mark16-15.jpg",
  q2: "q2_john16-33.jpg",
  q3: "q3_rev22-20.jpg",
  q4: "q4_rom10-14.jpg",
  q5: "q5_mark10-45.jpg",
};

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/opt/google/chrome/chrome",
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1400, deviceScaleFactor: 2 });
await page.goto(`file://${html}`, { waitUntil: "networkidle0", timeout: 60000 });
await page.evaluate(async () => {
  await document.fonts.ready;
});
const families = await page.evaluate(() => [...document.fonts].map((font) => `${font.family}:${font.status}`));
console.log(families.join("\n"));
await mkdir(outDir, { recursive: true });

for (const id of ids) {
  const element = await page.$(`#${id}`);
  if (!element) throw new Error(`Missing #${id}`);
  const png = await element.screenshot({ type: "png" });
  const target = path.join(outDir, names[id]);
  await sharp(png).resize(1080, 1350).jpeg({ quality: 90, mozjpeg: true }).toFile(target);
  console.log(target);
}

await browser.close();
