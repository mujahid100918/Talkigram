export type GalleryItem = { url: string; type: string };

export function mediaGallery(media: { media_url: string; media_type: string; media_items?: unknown }): GalleryItem[] {
  const items: GalleryItem[] = [];
  if (Array.isArray(media.media_items)) {
    for (const item of media.media_items) {
      if (typeof item !== "object" || item === null) continue;
      const row = item as Record<string, unknown>;
      if (typeof row["url"] === "string" && row["url"] && typeof row["type"] === "string") items.push({ url: row["url"], type: row["type"] });
    }
  }
  return items.length ? items : [{ url: media.media_url, type: media.media_type }];
}