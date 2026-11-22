import { readdirSync } from "fs";
import path from "path";

/**
 * Server-side SVG rendering for post graphics. Text uses only the fonts
 * bundled in /fonts (no system fonts), so a card renders the same locally
 * and on Vercel.
 */

const FONT_DIR = path.join(process.cwd(), "fonts");
export const MAX_SVG_BYTES = 400_000;

export const FONT_FAMILIES = [
  "Bodoni Moda",
  "Anton",
  "Yellowtail",
  "Space Mono",
  "Bebas Neue",
  "Playfair Display",
  "Old Standard TT",
  "UnifrakturMaguntia",
];

let fontFiles: string[] | null = null;
function fonts() {
  if (!fontFiles) {
    fontFiles = readdirSync(FONT_DIR)
      .filter((name) => name.endsWith(".ttf"))
      .map((name) => path.join(FONT_DIR, name));
  }
  return fontFiles;
}

export class RenderError extends Error {}

/**
 * Rejects anything that could make the renderer read files or reach the
 * network. Images inside the SVG must be data: URIs; other href targets
 * must be in-document (#id) references.
 */
export function assertSafeSvg(svg: string) {
  if (Buffer.byteLength(svg, "utf8") > MAX_SVG_BYTES) {
    throw new RenderError(`SVG is larger than ${MAX_SVG_BYTES / 1000} KB.`);
  }
  if (!/^\s*(<\?xml[^>]*\?>\s*)?<svg[\s>]/i.test(svg)) {
    throw new RenderError("Send a single <svg> document.");
  }
  if (/<!DOCTYPE|<!ENTITY/i.test(svg)) {
    throw new RenderError("DOCTYPE and ENTITY declarations are not allowed.");
  }
  const hrefs = svg.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi);
  for (const match of hrefs) {
    const value = match[1].trim();
    if (!value.startsWith("#") && !value.startsWith("data:image/") && !/^photo:[a-z0-9_-]{1,40}$/i.test(value)) {
      throw new RenderError(
        `External reference "${value.slice(0, 80)}" is not allowed. Pass photos in the photos list and use href="photo:NAME".`,
      );
    }
  }
  if (/url\(\s*["']?(?!#)/i.test(svg)) {
    throw new RenderError("CSS url() may only point at in-document ids, like url(#grain).");
  }
}

function svgSize(svg: string) {
  const viewBox = svg.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
  if (viewBox) return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
  const width = svg.match(/<svg[^>]*\swidth\s*=\s*["']([\d.]+)/i);
  const height = svg.match(/<svg[^>]*\sheight\s*=\s*["']([\d.]+)/i);
  if (width && height) return { width: Number(width[1]), height: Number(height[1]) };
  return null;
}

/** A photo already downloaded and checked by the caller. */
export type SvgPhoto = { name: string; bytes: Buffer };

/**
 * Swap href="photo:NAME" for an embedded JPEG data URI. Photos are re-encoded
 * (max 2160px on the long side) so the SVG stays a manageable size and any
 * odd source format becomes plain JPEG.
 */
async function embedPhotos(svg: string, photos: SvgPhoto[]) {
  const wanted = new Set(
    [...svg.matchAll(/href\s*=\s*["']photo:([a-z0-9_-]{1,40})["']/gi)].map((m) => m[1].toLowerCase()),
  );
  if (!wanted.size) return svg;
  const byName = new Map(photos.map((p) => [p.name.toLowerCase(), p]));
  const missing = [...wanted].filter((name) => !byName.has(name));
  if (missing.length) {
    throw new RenderError(`The SVG uses photo:${missing.join(", photo:")} but no photo with that name was given.`);
  }
  const sharp = (await import("sharp")).default;
  const uris = new Map<string, string>();
  for (const name of wanted) {
    const photo = byName.get(name)!;
    let jpeg: Buffer;
    try {
      jpeg = await sharp(photo.bytes)
        .rotate()
        .resize(2160, 2160, { fit: "inside", withoutEnlargement: true })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 88 })
        .toBuffer();
    } catch {
      throw new RenderError(`photo:${name} is not an image the renderer can read.`);
    }
    uris.set(name, `data:image/jpeg;base64,${jpeg.toString("base64")}`);
  }
  return svg.replace(/(href\s*=\s*["'])photo:([a-z0-9_-]{1,40})(["'])/gi, (_all, open, name, close) => {
    return `${open}${uris.get(String(name).toLowerCase())}${close}`;
  });
}

export async function renderSvg(svg: string, options: { width?: number; photos?: SvgPhoto[] } = {}) {
  assertSafeSvg(svg);
  if (options.photos?.length || /photo:/i.test(svg)) {
    svg = await embedPhotos(svg, options.photos ?? []);
  }
  const size = svgSize(svg);
  if (!size) throw new RenderError("Give the <svg> a viewBox, for example viewBox=\"0 0 1080 1350\".");
  const width = options.width ?? size.width;
  if (width < 100 || width > 2160) throw new RenderError("Render width must be between 100 and 2160 px.");

  const { Resvg } = await import("@resvg/resvg-js");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: Math.round(width) },
    font: {
      fontFiles: fonts(),
      loadSystemFonts: false,
      defaultFontFamily: "Space Mono",
    },
    background: "#ffffff",
  });
  const png = resvg.render().asPng();

  const sharp = (await import("sharp")).default;
  const jpeg = await sharp(png).jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: "4:4:4" }).toBuffer();
  const meta = await sharp(jpeg).metadata();
  return { jpeg, width: meta.width ?? width, height: meta.height ?? 0 };
}
