import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MediaLightbox } from "@/components/MediaLightbox";

afterEach(cleanup);
const media = { media_url: "/photo.jpg", media_type: "image" };

describe("Media viewer closing", () => {
  it("closes with the X control", () => {
    const close = vi.fn();
    render(<MediaLightbox media={media} onClose={close} />);
    fireEvent.click(screen.getByRole("button", { name: "Close media preview" }));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("closes on the surrounding backdrop, but not on the photo", () => {
    const close = vi.fn();
    render(<MediaLightbox media={media} onClose={close} />);
    fireEvent.click(screen.getByRole("img"));
    expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("dialog"));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("closes with Escape", () => {
    const close = vi.fn();
    render(<MediaLightbox media={media} onClose={close} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(close).toHaveBeenCalledTimes(1);
  });
  it("navigates between multiple photos", () => {
    render(<MediaLightbox media={{ ...media, media_items: [{ url: "/one.jpg", type: "image" }, { url: "/two.jpg", type: "image" }] }} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Next media" }));
    expect(screen.getByRole("img").getAttribute("src")).toBe("/two.jpg");
    fireEvent.click(screen.getByRole("button", { name: "Previous media" }));
    expect(screen.getByRole("img").getAttribute("src")).toBe("/one.jpg");
  });
});