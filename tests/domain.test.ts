import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { captionStats, uniqueHashtags } from "../lib/caption";
import { canAssignRole, canApprove, canEdit } from "../lib/permissions";
import { mapFormat, parseSlides, publishBlockReason } from "../lib/posts";
import {
  addDaysToDateString,
  monthGrid,
  moveToChicagoDay,
  parseClock,
  startOfWeekMonday,
  zonedDateTime,
} from "../lib/time";

describe("plan mapping", () => {
  it("maps the five formats", () => {
    assert.equal(mapFormat("Quote post (single image 1080x1350)"), "QUOTE_CARD");
    assert.equal(mapFormat("Reel (15-20s)"), "REEL");
    assert.equal(mapFormat("Carousel (6 slides)"), "CAROUSEL");
    assert.equal(mapFormat("Product-in-life (photo, 1-3 images)"), "PHOTO");
    assert.equal(mapFormat("Engagement prompt (single graphic + Story poll)"), "ENGAGEMENT");
    assert.equal(mapFormat("Quote post + prayer prompt (single image)"), "QUOTE_CARD");
  });

  it("parses Central clock times", () => {
    assert.equal(parseClock("7:00 AM CT"), "07:00");
    assert.equal(parseClock("6:30 PM CT"), "18:30");
    assert.equal(parseClock("12:00 PM CT"), "12:00");
    assert.equal(parseClock("12:00 AM CT"), "00:00");
  });

  it("splits carousel lines", () => {
    const slides = parseSlides("S1 (hook): Five hats\nS2: Holy Spirit");
    assert.equal(slides.length, 2);
    assert.equal(slides[0].heading, "S1 (hook)");
    assert.equal(slides[1].body, "Holy Spirit");
  });
});

describe("calendar time", () => {
  it("keeps October 12 2026 on a Monday week", () => {
    assert.equal(startOfWeekMonday("2026-10-12"), "2026-10-12");
    assert.equal(startOfWeekMonday("2026-10-18"), "2026-10-12");
    const days = monthGrid(2026, 10);
    assert.ok(days.includes("2026-10-12"));
    assert.ok(days.includes("2026-11-01"));
  });

  it("converts Chicago slots to UTC across the DST change", () => {
    const october = zonedDateTime("2026-10-12", "07:00");
    assert.equal(october.toISOString(), "2026-10-12T12:00:00.000Z");
    const november = zonedDateTime("2026-11-01", "07:30");
    assert.equal(november.toISOString(), "2026-11-01T13:30:00.000Z");
  });

  it("moves a post to a new day without changing the clock", () => {
    const moved = moveToChicagoDay(zonedDateTime("2026-10-12", "07:00"), "2026-10-19");
    assert.equal(moved.toISOString(), "2026-10-19T12:00:00.000Z");
    assert.equal(addDaysToDateString("2026-10-31", 1), "2026-11-01");
  });
});

describe("captions and approval", () => {
  it("counts characters and hashtags separately from the body", () => {
    const stats = captionStats("Hello", "#one #two");
    assert.equal(stats.hashtagCount, 2);
    assert.equal(stats.characters, "Hello\n\n#one #two".length);
    assert.equal(stats.overCharacters, false);
    assert.equal(uniqueHashtags("#one", "#one #two"), "#one #two");
  });

  it("refuses to publish unless an owner or admin scheduled it", () => {
    const base = {
      status: "SCHEDULED",
      approvedById: "user",
      approverRole: "OWNER",
      scheduledAt: new Date("2026-10-12T12:00:00.000Z"),
    };
    assert.equal(publishBlockReason(base, new Date("2026-10-12T12:00:00.000Z")), null);
    assert.ok(publishBlockReason({ ...base, status: "APPROVED" }));
    assert.ok(publishBlockReason({ ...base, approverRole: "EDITOR" }));
    assert.ok(publishBlockReason({ ...base, approvedById: null, approverRole: null }));
    assert.ok(publishBlockReason(base, new Date("2026-10-12T11:00:00.000Z")));
  });

  it("limits who can edit, approve, and assign owner", () => {
    assert.equal(canEdit("EDITOR"), true);
    assert.equal(canEdit("VIEWER"), false);
    assert.equal(canApprove("ADMIN"), true);
    assert.equal(canApprove("EDITOR"), false);
    assert.equal(canAssignRole("ADMIN", "EDITOR"), true);
    assert.equal(canAssignRole("ADMIN", "OWNER"), false);
    assert.equal(canAssignRole("OWNER", "OWNER"), true);
  });
});
