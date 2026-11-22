import { FONT_FAMILIES } from "@/lib/render";

/**
 * Returned by the MCP tool get_brand_guide so an assistant drafting posts
 * starts from the house style instead of guessing. Based on the live
 * Instagram feed and a look at comparable brands (Nov 2026).
 */

export const REFERENCE_QUOTE_CARD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1350">
  <defs>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7"/>
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0"/>
    </filter>
    <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
      <stop offset="60%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.10"/>
    </radialGradient>
  </defs>
  <rect width="1080" height="1350" fill="#F1EBDD"/>
  <rect x="43" y="43" width="994" height="1264" fill="none" stroke="#0A0A0A" stroke-width="3"/>
  <g font-family="Space Mono" font-size="19" letter-spacing="5" fill="#0A0A0A">
    <text x="85" y="94">NO. 01</text>
    <text x="995" y="94" text-anchor="end">THE GREAT COMMISSION</text>
    <text x="85" y="1277">EST. HOUSTON TX</text>
    <text x="995" y="1277" text-anchor="end">PREACHTHEGOSPEL.STORE</text>
  </g>
  <text transform="translate(540 1262) rotate(180)" text-anchor="middle" font-family="Anton" font-size="22" fill="#0A0A0A">PREACH THE GOSPEL.</text>
  <g transform="translate(540 0) scale(0.7 1)" font-family="Bodoni Moda" font-size="150" letter-spacing="-6" text-anchor="middle" fill="#0A0A0A">
    <text x="0" y="232">GO INTO ALL</text>
    <text x="0" y="340">THE WORLD</text>
    <text x="0" y="526">THE GOSPEL</text>
  </g>
  <text x="566" y="412" text-anchor="middle" font-family="Yellowtail" font-size="100" fill="#E01F26" transform="rotate(-11 566 412)">and preach</text>
  <text x="540" y="612" text-anchor="middle" font-family="Anton" font-size="72" fill="#0A0A0A">TO EVERY CREATURE.</text>
  <rect x="498" y="654" width="84" height="5" fill="#E01F26"/>
  <text x="540" y="697" text-anchor="middle" font-family="Space Mono" font-size="19" letter-spacing="5" fill="#0A0A0A">MARK 16:15 · BSB</text>
  <rect width="1080" height="1350" filter="url(#grain)"/>
  <rect width="1080" height="1350" fill="url(#vignette)"/>
</svg>`;

export const BRAND_GUIDE = `# Preach the Gospel (@preachthegospel.store) — house style

Christian streetwear from Houston. Bio: "MORE THAN MERCH. IT'S A MOVEMENT." Online at preachthegospel.store, plus pieces in person at the store. Many pieces are made to order (ships in 14–21 days). Close partner account: @revrodhtx; collab posts with them get the most engagement.

## What the feed actually looks like (from @preachthegospel.store, Nov 2026)
- Photo-led. Almost every post is a real photograph, usually a carousel: people wearing the pieces, shot dark and moody (black backgrounds, tungsten or stage light, film grain), back prints facing camera, plus travel and everyday settings (the gym, a worship night, the pyramids, a waterfall) and product still-lifes (hats on a table, tees on a rack).
- Type on photos, when used: tall condensed sans (Bebas Neue / Anton), all caps, bone #EDE6D6 on the dark photo, stacked and staggered left/right ("BLACK / FRIDAY / IS / COMING", "A NEW DECADE IS HERE", "NEW ARRIVALS" repeated).
- Spec-sheet slides: small Space Mono text over a photo — product name left, price in brackets right ("MAKE DISCIPLES TEE        [ $35 ]"), a short "SPECS" list ([1] ... [2] ...).
- Logo: the inverted PREACH THE GOSPEL. mark as a small watermark.
- Occasional typographic tile (Bodoni "KING of KINGS" repeated).
- Never: clip-art, stock-photo smiles, bright gradients, busy layouts.

## Captions (match these)
- 2–4 short lines. Often all lowercase. Warm, plain, a little understated: "the wait is almost over. 🖤✨", "New season, same mission. 🕊️", "the details matter. ☕️✨".
- Scripture posts: one line, then the verse with its reference ("📖 Romans 1:16 — ..."). Quote scripture word for word and name the reference; never paraphrase inside quotation marks.
- One or two emojis from 🖤 🤍 🕊️ 🔥 ✨ 📖. No hype words, no walls of text.
- 3 hashtags, at the end, in the hashtags field.

## Hashtags (pick 3)
{{HASHTAG_SETS}}

## Caption closers saved in the desk (use sparingly; the live feed rarely uses them)
{{TEMPLATES}}

## What similar brands do well (research, Nov 2026)
- Rodeo in the Sky (99K): names every product and pairs it with its verse ("The Dust // Genesis 2:7"); teases a drop with a date, then posts "Now Live"; numbered restock carousels; minimal black tiles with one small centered line of scripture. Drop posts get its best engagement.
- Elevated Faith (737K): posts daily; Reels with conversation hooks ("where'd you get your hoodie?" turns into a conversation about Jesus); countdowns ("drops tomorrow"); unboxing Reels; constant reposts of customers and ambassadors.
- Sek Apparel: a single "everything on sale" grid of all products with the discount for Black Friday.

## Formats
QUOTE_CARD (single 1080x1350 image), CAROUSEL (2–10 images, 1080x1350 each, the default here), PHOTO (product in life), ENGAGEMENT (this-or-that, prompt), REEL (MP4 only; script goes in notes until a video exists).
Usual slots (America/Chicago): 7:00 AM, 12:00 PM, 5:00 PM, 6:30 PM, 7:30 PM.

## Making graphics
- Canvas 1080x1350 (4:5). Always viewBox="0 0 1080 1350".
- Photos: pass them in the tool's photos list and place them with <image href="photo:NAME" width="1080" height="1350" preserveAspectRatio="xMidYMid slice"/>. Sources: the desk's Media library (list_media: shoot photos uploaded there) first, then product photos on cdn.shopify.com (mostly white-background shots; good for product grids and spec slides, not as full-bleed backgrounds). Darken with a gradient where type sits; add light grain.
- Palette: Ink #0A0A0A, Bone #EDE6D6 (type on photos), Bone paper #F1EBDD, Revival Red #E01F26 (sparingly).
- Fonts available, and nothing else: ${FONT_FAMILIES.join(", ")}. Use these exact font-family names. Bodoni Moda is the Black cut only.
- SVG has no text wrapping: one <text> per line.
- No other external files or URLs.
- Preview with render_graphic before attaching. Check every word of a verse.
`;

export function brandGuideText(input: {
  templates: { name: string; body: string }[];
  hashtagSets: { name: string; tags: string }[];
}) {
  const templates = input.templates.length
    ? input.templates.map((t) => `- ${t.name}: "${t.body}"`).join("\n")
    : "- (none saved yet)";
  const sets = input.hashtagSets.length
    ? input.hashtagSets.map((s) => `- ${s.name}: ${s.tags}`).join("\n")
    : "- (no saved sets yet)";
  return BRAND_GUIDE.replace("{{TEMPLATES}}", templates).replace("{{HASHTAG_SETS}}", sets);
}
