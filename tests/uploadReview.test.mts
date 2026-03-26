import assert from "node:assert/strict";
import test from "node:test";
import type { UploadDraftItem } from "../types/api.ts";
import {
  countUnresolvedManualReviews,
  isItemMarkedForManualReview,
  isManualReviewResolved,
} from "../lib/uploadReview.ts";

function makeItem(overrides: Partial<UploadDraftItem> = {}): UploadDraftItem {
  return {
    id: "item-1",
    source: "LOCAL",
    originalName: "Series - 1.cbz",
    parsed: {
      originalTitle: "Series",
      normalizedTitle: "Series",
      number: 1,
      volume: null,
      year: null,
      isOneShot: false,
    },
    suggestion: {
      existingSeriesMatch: false,
      confidence: "low",
      reviewRequired: true,
    },
    plan: {
      tags: [],
      description: "",
      status: "",
      author: "",
      artist: "",
    },
    ...overrides,
  };
}

test("isItemMarkedForManualReview follows suggestion/ingestion flags", () => {
  const reviewItem = makeItem();
  const autoItem = makeItem({
    suggestion: {
      ...makeItem().suggestion,
      reviewRequired: false,
    },
  });

  assert.equal(isItemMarkedForManualReview(reviewItem), true);
  assert.equal(isItemMarkedForManualReview(autoItem), false);
});

test("isManualReviewResolved requires explicit resolvable decision", () => {
  const unresolved = makeItem();
  const existingSeries = makeItem({
    plan: {
      ...makeItem().plan,
      decision: "EXISTING_SERIES",
      targetSeriesId: "series-123",
    },
  });
  const newSeries = makeItem({
    plan: {
      ...makeItem().plan,
      decision: "NEW_SERIES",
      newSeriesTitle: "My New Series",
    },
  });
  const skipped = makeItem({
    plan: {
      ...makeItem().plan,
      decision: "SKIP",
    },
  });

  assert.equal(isManualReviewResolved(unresolved), false);
  assert.equal(isManualReviewResolved(existingSeries), true);
  assert.equal(isManualReviewResolved(newSeries), true);
  assert.equal(isManualReviewResolved(skipped), true);
});

test("countUnresolvedManualReviews counts only unresolved review items", () => {
  const unresolved = makeItem({ id: "a" });
  const resolved = makeItem({
    id: "b",
    plan: {
      ...makeItem().plan,
      decision: "SKIP",
    },
  });
  const auto = makeItem({
    id: "c",
    suggestion: {
      ...makeItem().suggestion,
      reviewRequired: false,
    },
  });

  assert.equal(countUnresolvedManualReviews([unresolved, resolved, auto]), 1);
});

