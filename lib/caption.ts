export const IG_CAPTION_LIMIT = 2200;
export const IG_HASHTAG_LIMIT = 30;

export function parseHashtags(raw: string) {
  return raw.match(/#[\p{L}\p{N}_]+/gu) ?? [];
}

export function captionStats(caption: string, hashtags: string) {
  const tags = parseHashtags(hashtags);
  const combined = [caption.trim(), hashtags.trim()].filter(Boolean).join("\n\n");
  return {
    characters: combined.length,
    hashtagCount: tags.length,
    overCharacters: combined.length > IG_CAPTION_LIMIT,
    overHashtags: tags.length > IG_HASHTAG_LIMIT,
    combined,
  };
}

export function uniqueHashtags(existing: string, incoming: string) {
  const have = new Set(parseHashtags(existing).map((tag) => tag.toLowerCase()));
  const add = parseHashtags(incoming).filter((tag) => !have.has(tag.toLowerCase()));
  return [existing.trim(), add.join(" ")].filter(Boolean).join(" ").trim();
}
