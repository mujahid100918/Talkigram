import { describe, expect, it } from "vitest";
import { mediaGallery } from "@/lib/media-gallery";

describe("Post media gallery", () => {
  it("preserves the original media for single-media posts", () => {
    expect(mediaGallery({ media_url: "/original.jpg", media_type: "image", media_items: [] })).toEqual([{ url: "/original.jpg", type: "image" }]);
  });
  it("returns multiple stored images in their saved order", () => {
    expect(mediaGallery({ media_url: "/first.jpg", media_type: "image", media_items: [{ url: "/first.jpg", type: "image" }, { url: "/second.jpg", type: "image" }] })).toEqual([{ url: "/first.jpg", type: "image" }, { url: "/second.jpg", type: "image" }]);
  });
});