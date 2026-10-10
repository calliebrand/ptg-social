import { z } from "zod";

export const slideSchema = z.object({
  heading: z.string().max(300),
  body: z.string().max(4000),
});

export const postInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required.").max(200),
  caption: z.string().max(8000),
  hashtags: z.string().max(2000),
  postType: z.enum(["QUOTE_CARD", "REEL", "CAROUSEL", "PHOTO", "ENGAGEMENT"]),
  scheduledDate: z.string().max(10),
  scheduledTime: z.string().max(5),
  notes: z.string().max(8000),
  bibleReference: z.string().max(300),
  quoteText: z.string().max(4000),
  pillar: z.string().max(200),
  productTie: z.string().max(500),
  visualDirection: z.string().max(8000),
  palette: z.string().max(500),
  productionNotes: z.string().max(8000),
  cta: z.string().max(300),
  assetStatus: z.string().max(200),
  slides: z.array(slideSchema).max(20),
});

export type PostInput = z.infer<typeof postInputSchema>;

export function emptyPostInput(): PostInput {
  return {
    title: "",
    caption: "",
    hashtags: "",
    postType: "QUOTE_CARD",
    scheduledDate: "",
    scheduledTime: "",
    notes: "",
    bibleReference: "",
    quoteText: "",
    pillar: "",
    productTie: "",
    visualDirection: "",
    palette: "",
    productionNotes: "",
    cta: "",
    assetStatus: "",
    slides: [],
  };
}
