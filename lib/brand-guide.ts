import { FONT_FAMILIES } from "@/lib/render";

/**
 * Returned by the MCP tool get_brand_guide so an assistant drafting posts
 * starts from the house style instead of guessing. Distilled from
 * data/plan.csv and scripts/posters.html.
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

Christian streetwear from Houston. preachthegospel.store. Pieces are made to order (ships in 14–21 days, no exchanges on tees).

## Voice
- Short, direct, warm. Confident, never preachy. Speaks to everyday Houston life (the office, the gym, the 610, the taco line).
- Open with a one-line hook (often a twist or a question), then the verse in quotes with its reference, then one or two lines that land it in real life, then a clear CTA, then the product tie with price.
- One emoji at most per paragraph, usually one per post. No hype words, no ALL CAPS sentences.
- Quote scripture word for word from the translation you name (default BSB). Never paraphrase a verse inside quotation marks, and never attribute words to scripture that are not there.
- Spanish line ("El Movimiento", Siervo Local) is welcome where it fits the product.

## Caption closers (caption templates in the desk)
{{TEMPLATES}}

## Hashtags
- 4–8 per post, put in the hashtags field, not the caption. Always include #preachthegospel.
{{HASHTAG_SETS}}

## Content mix and pillars
Scripture / brand verse, Brand story, Product / new drop, Product in life (Houston, everyday faith), Community, Witness / equipping, Education (remove purchase friction), Behind the scenes / trust.
Formats: QUOTE_CARD (single 1080x1350 image), CAROUSEL (2–10 images, 1080x1350 each), PHOTO (product in life), ENGAGEMENT (this-or-that, quiz, prompt graphic), REEL (MP4 only; script goes in notes until a video is attached).
CTAs that worked: Save, Share to Story, Tag a friend, Comment a number 1–5, Comment your answer, Shop link in bio.
Usual slots (America/Chicago): 7:00 AM, 12:00 PM, 5:00 PM, 6:30 PM, 7:30 PM. Roughly one post a day, Mon/Tue/Thu/Sun heaviest.

## Visual system
- Canvas: 1080x1350 (4:5). Always set viewBox="0 0 1080 1350".
- Palette: Bone #F1EBDD (background), Ink #0A0A0A (type, frame), Revival Red #E01F26 (script accent, rule). Product posts may borrow a product color (Nazarene Red, Nazarene Navy).
- Frame: thin Ink rectangle inset 43px, stroke 3.
- Header (Space Mono 19, letter-spacing 5): "NO. 0X" left, short title right. Footer: "EST. HOUSTON TX" left, "PREACHTHEGOSPEL.STORE" right, upside-down Anton "PREACH THE GOSPEL." centered (the inverted-print signature).
- Headline: Bodoni Moda Black, uppercase, stacked, horizontally condensed with scale(0.7 1) inside a translate(540 0) group so text-anchor middle stays centered. ~150px, tight letter-spacing.
- Accent: one Yellowtail red script phrase that breaks across the stack, rotated about -8 to -12 degrees.
- Kicker: Anton uppercase line under the stack, then a short red rule (84x5) and the reference in Space Mono.
- Finish: light grain (feTurbulence) and a soft vignette, as in the reference SVG.
- Leave generous empty space below the type block. Keep text inside the frame (x 85–995).

## Rendering rules (render_graphic / add_graphic_to_post)
- Fonts available, and nothing else: ${FONT_FAMILIES.join(", ")}. Use these exact font-family names. Bodoni Moda is the Black cut only.
- SVG has no text wrapping: break lines yourself, one <text> per line.
- No external files or URLs. Photos inside an SVG must be data:image/... URIs; to post a product photo as-is, use add_media_from_url.
- Preview with render_graphic before attaching. Check spacing, overlap, and that every word of a verse is present and correct.
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
