import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ActivityItem } from "@/lib/types";
import { aspectOf, textureUrl, toExhibitPieces } from "./pieces.ts";

const SRC = "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/v1/portfolio/art/x.jpg";

function item(slug: string, overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    slug,
    section: "art-portfolio",
    title: { en: `T ${slug}`, vi: `V ${slug}` },
    date: "2025",
    caption: { en: "c", vi: "c" },
    media: [{ type: "image", src: SRC, width: 2000, height: 1000, alt: { en: "alt", vi: "alt" } }],
    status: "published",
    ...overrides,
  };
}

describe("toExhibitPieces", () => {
  it("orders by painting number, not alphabetically", () => {
    const pieces = toExhibitPieces([item("tranh-10-x"), item("tranh-2-x"), item("tranh-1-x")]);
    assert.deepEqual(
      pieces.map((p) => p.slug),
      ["tranh-1-x", "tranh-2-x", "tranh-10-x"],
    );
  });
  it("skips unpublished items", () => {
    const pieces = toExhibitPieces([item("tranh-1-x"), item("tranh-2-x", { status: "coming-soon" })]);
    assert.equal(pieces.length, 1);
  });
  it("skips items without an image", () => {
    const pieces = toExhibitPieces([item("tranh-1-x", { media: [] }), item("tranh-2-x")]);
    assert.deepEqual(
      pieces.map((p) => p.slug),
      ["tranh-2-x"],
    );
  });
  it("carries the image, size and text across", () => {
    const [piece] = toExhibitPieces([item("tranh-1-x")]);
    assert.equal(piece.src, SRC);
    assert.equal(piece.width, 2000);
    assert.equal(piece.height, 1000);
    assert.deepEqual(piece.alt, { en: "alt", vi: "alt" });
    assert.equal(piece.date, "2025");
  });
  it("falls back to the title for alt, and to 4:3 without a size", () => {
    const [piece] = toExhibitPieces([item("tranh-1-x", { media: [{ type: "image", src: SRC }] })]);
    assert.deepEqual(piece.alt, { en: "T tranh-1-x", vi: "V tranh-1-x" });
    assert.equal(aspectOf(piece), 4 / 3);
  });
  it("puts items without a painting number last", () => {
    const pieces = toExhibitPieces([item("zzz"), item("tranh-3-x")]);
    assert.deepEqual(
      pieces.map((p) => p.slug),
      ["tranh-3-x", "zzz"],
    );
  });
});

describe("aspectOf", () => {
  it("is width over height", () => {
    const [piece] = toExhibitPieces([item("tranh-1-x")]);
    assert.equal(aspectOf(piece), 2);
  });
});

describe("textureUrl", () => {
  it("asks Cloudinary for a capped width", () => {
    assert.equal(
      textureUrl(SRC, 1024),
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_1024/v1/portfolio/art/x.jpg",
    );
  });
  it("defaults to 2048 wide", () => {
    assert.ok(textureUrl(SRC).includes("c_limit,w_2048"));
  });
  it("leaves other URLs alone", () => {
    assert.equal(textureUrl("https://example.com/a.jpg"), "https://example.com/a.jpg");
  });
});
