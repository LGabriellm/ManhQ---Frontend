import type { UploadDraftItem } from "@/types/api";

export function isItemMarkedForManualReview(item: UploadDraftItem): boolean {
  return Boolean(item.suggestion.reviewRequired ?? item.ingestion?.reviewRequired);
}

export function isManualReviewResolved(item: UploadDraftItem): boolean {
  if (!isItemMarkedForManualReview(item)) {
    return true;
  }

  const decision = item.plan.decision;
  if (!decision) {
    return false;
  }

  if (decision === "EXISTING_SERIES") {
    return Boolean(item.plan.targetSeriesId || item.suggestion.matchedSeriesId);
  }

  if (decision === "NEW_SERIES") {
    return Boolean(item.plan.newSeriesTitle || item.parsed.normalizedTitle);
  }

  return decision === "SKIP";
}

export function countUnresolvedManualReviews(items: UploadDraftItem[]): number {
  return items.filter((item) => !isManualReviewResolved(item)).length;
}

export function getItemConfidenceScore(item: UploadDraftItem): number | null {
  if (typeof item.suggestion.confidenceScore === "number") {
    return item.suggestion.confidenceScore;
  }
  if (typeof item.ingestion?.confidenceScore === "number") {
    return item.ingestion.confidenceScore;
  }
  return null;
}

