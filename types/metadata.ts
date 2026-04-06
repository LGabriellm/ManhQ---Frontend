/* ─────────────────────────────────────────────────────────────────────────────
 * Metadata Review — Domain Types
 * ───────────────────────────────────────────────────────────────────────────── */

export type WorkType =
  | "comic"
  | "manga"
  | "manhwa"
  | "webtoon"
  | "novel"
  | "light_novel"
  | "other";

export type CanonicalGenre =
  | "action"
  | "adventure"
  | "biography"
  | "comedy"
  | "crime"
  | "drama"
  | "educational"
  | "fantasy"
  | "historical"
  | "horror"
  | "mystery"
  | "romance"
  | "sci_fi"
  | "slice_of_life"
  | "sports"
  | "supernatural"
  | "thriller";

export type ThemeCode =
  | "coming_of_age"
  | "crime_underworld"
  | "detective"
  | "family"
  | "isekai"
  | "magic"
  | "martial_arts"
  | "mecha"
  | "military"
  | "monsters"
  | "mythology"
  | "politics"
  | "post_apocalyptic"
  | "psychological"
  | "revenge"
  | "school"
  | "space"
  | "superhero"
  | "survival"
  | "time_travel"
  | "vampires"
  | "workplace"
  | "zombies";

export type AudienceCode =
  | "kids"
  | "teen"
  | "young_adult"
  | "adult"
  | "shounen"
  | "shoujo"
  | "seinen"
  | "josei";

export type MetadataSource =
  | "anilist"
  | "mangadex"
  | "myanimelist"
  | "openlibrary"
  | "googlebooks"
  | "comicvine"
  | "wikipedia";

export interface MetadataSourceRecord {
  source: MetadataSource;
  externalId: string | number;
  lastFetchedAt: string | null;
  matchConfidence: number;
  matchedTitle?: string;
  sourceUrl?: string;
}

export interface MetadataCatalogOption<TCode extends string> {
  code: TCode;
  label: string;
  description?: string;
}

export interface MetadataCatalog {
  workTypes: MetadataCatalogOption<WorkType>[];
  canonicalGenres: MetadataCatalogOption<CanonicalGenre>[];
  themes: MetadataCatalogOption<ThemeCode>[];
  audience: MetadataCatalogOption<AudienceCode>[];
}

export interface MetadataProviderInfo {
  name: MetadataSource;
  displayName: string;
  supportedWorkTypes: WorkType[];
  officialApi: boolean;
  requiresApiKey: boolean;
  policyNotes: string;
  timeoutMs: number;
  available: boolean;
}

export interface MetadataProviderCandidate {
  source: MetadataSource;
  externalId: string | number;
  title: string;
  titleEnglish: string | null;
  titleNative: string | null;
  titlePortuguese: string | null;
  alternativeTitles: string[];
  rawGenres: string[];
  rawTags: string[];
  canonicalGenres: CanonicalGenre[];
  themes: ThemeCode[];
  audience: AudienceCode[];
  workTypeHint: WorkType;
  author: string | null;
  artist: string | null;
  description?: string | null;
  status: string | null;
  chapters: number | null;
  volumes: number | null;
  startYear: number | null;
  endYear: number | null;
  averageScore: number | null;
  popularity: number | null;
  coverUrlLarge: string | null;
  coverUrlMedium: string | null;
  bannerUrl: string | null;
  isAdult: boolean;
  countryOfOrigin: string | null;
  matchConfidence: number;
  sourceUrl?: string | null;
}

export interface MetadataSuggestion {
  primarySource: MetadataSource | null;
  title: string;
  titleEnglish: string | null;
  titleNative: string | null;
  titlePortuguese: string | null;
  titleAliases: string[];
  description: string | null;
  author: string | null;
  artist: string | null;
  status: string | null;
  chapters: number | null;
  volumes: number | null;
  startYear: number | null;
  endYear: number | null;
  coverUrlLarge: string | null;
  coverUrlMedium: string | null;
  isAdult: boolean;
  countryOfOrigin: string | null;
  workType: WorkType;
  canonicalGenres: CanonicalGenre[];
  themes: ThemeCode[];
  audience: AudienceCode[];
  metadataConfidence: number;
  metadataConfidenceLabel: "low" | "medium" | "high";
  reviewRequired: boolean;
  confidenceReasons: string[];
  metadataSources: MetadataSourceRecord[];
  sourceTags: Array<{
    rawValue?: string;
    label?: string;
    mappedLabel?: string;
    source?: string;
  }>;
  providerCandidates: MetadataProviderCandidate[];
  legacyTags: string[];
}

export interface SeriesMetadataView {
  seriesId: string;
  current: {
    title: string;
    description: string | null;
    author: string | null;
    artist: string | null;
    status: string | null;
    workType: WorkType;
    tags: string[];
  };
  suggestion:
    | (MetadataSuggestion & {
        lastEnrichedAt: string | null;
        lastReviewedAt: string | null;
      })
    | null;
}

export interface SeriesMetadataResponse {
  metadata: SeriesMetadataView;
  catalog?: MetadataCatalog;
}

export interface ReviewSeriesMetadataRequest {
  title?: string;
  description?: string;
  author?: string;
  artist?: string;
  status?: string;
  workType?: WorkType;
  canonicalGenres?: CanonicalGenre[];
  themes?: ThemeCode[];
  audience?: AudienceCode[];
  titleAliases?: string[];
}

export interface MetadataReviewDraft {
  title: string;
  description: string;
  author: string;
  artist: string;
  status: string;
  workType: WorkType;
  canonicalGenres: CanonicalGenre[];
  themes: ThemeCode[];
  audience: AudienceCode[];
  titleAliases: string[];
}

export function buildMetadataReviewDraft(
  metadata: SeriesMetadataView,
): MetadataReviewDraft {
  const suggestion = metadata.suggestion;
  const current = metadata.current;
  return {
    title: current.title || suggestion?.title || "",
    description: current.description || suggestion?.description || "",
    author: current.author || suggestion?.author || "",
    artist: current.artist || suggestion?.artist || "",
    status: current.status || suggestion?.status || "",
    workType: current.workType || suggestion?.workType || "manga",
    canonicalGenres: suggestion?.canonicalGenres ?? [],
    themes: suggestion?.themes ?? [],
    audience: suggestion?.audience ?? [],
    titleAliases: suggestion?.titleAliases ?? [],
  };
}

export function parseAliases(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinAliases(aliases: string[]): string {
  return aliases.join(", ");
}

export function metadataConfidenceClass(
  label: "low" | "medium" | "high",
): string {
  switch (label) {
    case "high":
      return "text-emerald-300";
    case "medium":
      return "text-amber-300";
    case "low":
      return "text-rose-300";
  }
}
