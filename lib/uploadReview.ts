import type { UploadDraftItem } from "@/types/api";

type UploadReviewItemLike = UploadDraftItem & {
  parsing?: {
    requiresManualReview?: boolean;
    confidence?: "high" | "medium" | "low";
  };
  job?: {
    userActionRequired?: boolean;
    canReview?: boolean;
  };
};

export function isItemMarkedForManualReview(item: UploadReviewItemLike): boolean {
  return Boolean(
    item.parsing?.requiresManualReview ??
      item.job?.userActionRequired ??
      item.suggestion.reviewRequired ??
      item.ingestion?.reviewRequired,
  );
}

export function isManualReviewResolved(item: UploadReviewItemLike): boolean {
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

export function countUnresolvedManualReviews(items: UploadReviewItemLike[]): number {
  return items.filter((item) => !isManualReviewResolved(item)).length;
}

export function getItemConfidenceScore(item: UploadReviewItemLike): number | null {
  if (item.parsing?.confidence === "high") {
    return 100;
  }
  if (item.parsing?.confidence === "medium") {
    return 60;
  }
  if (item.parsing?.confidence === "low") {
    return 30;
  }
  if (typeof item.suggestion.confidenceScore === "number") {
    return item.suggestion.confidenceScore;
  }
  if (typeof item.ingestion?.confidenceScore === "number") {
    return item.ingestion.confidenceScore;
  }
  return null;
}
