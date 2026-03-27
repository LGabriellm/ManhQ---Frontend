import type {
  ReviewSeriesMetadataRequest,
  SeriesMetadataView,
} from "@/types/metadata-review";

export function buildMetadataReviewDraft(
  view: SeriesMetadataView,
): ReviewSeriesMetadataRequest {
  const suggestion = view.suggestion;

  return {
    workType: suggestion?.workType || view.current.workType,
    canonicalGenres: suggestion?.canonicalGenres || [],
    themes: suggestion?.themes || [],
    audience: suggestion?.audience || [],
    titleAliases: suggestion?.titleAliases || [],
    description: suggestion?.description ?? view.current.description ?? null,
    author: suggestion?.author ?? view.current.author ?? null,
    artist: suggestion?.artist ?? view.current.artist ?? null,
    status: suggestion?.status ?? view.current.status ?? null,
  };
}

export function parseAliases(value: string): string[] {
  return value
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function joinAliases(aliases: string[]): string {
  return aliases.join("\n");
}

export function metadataConfidenceClass(label: "low" | "medium" | "high") {
  if (label === "high") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
  }

  if (label === "medium") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-200";
  }

  return "border-rose-500/20 bg-rose-500/10 text-rose-200";
}
