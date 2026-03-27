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

export interface MetadataCatalogOption<TCode extends string> {
  code: TCode;
  label: string;
  description?: string;
}

export interface MetadataCatalog {
  workTypes: Array<MetadataCatalogOption<WorkType>>;
  canonicalGenres: Array<MetadataCatalogOption<CanonicalGenre>>;
  themes: Array<MetadataCatalogOption<ThemeCode>>;
  audience: Array<MetadataCatalogOption<AudienceCode>>;
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

export interface MetadataProvidersResponse {
  providers: MetadataProviderInfo[];
  catalog: MetadataCatalog;
}

export interface MetadataCatalogResponse {
  catalog: MetadataCatalog;
}

export interface MetadataSuggestionTag {
  source?: MetadataSource;
  label?: string;
  rawValue?: string;
  normalizedValue?: string | null;
  mappedCode?: string | null;
  mappedLabel?: string | null;
  confidence?: number | null;
  [key: string]: unknown;
}

export interface MetadataSourceRecord {
  source: MetadataSource;
  externalId?: string | number | null;
  matchedTitle?: string | null;
  sourceUrl?: string | null;
  confidence?: number | null;
  [key: string]: unknown;
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
  sourceTags: MetadataSuggestionTag[];
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
  primaryExternalId: string | number | null;
  title: string;
  titleEnglish: string | null;
  titleNative: string | null;
  titlePortuguese: string | null;
  titleAliases: string[];
  description: string | null;
  descriptionSummary: string | null;
  author: string | null;
  artist: string | null;
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
  workType: WorkType;
  canonicalGenres: CanonicalGenre[];
  themes: ThemeCode[];
  audience: AudienceCode[];
  sourceTags: MetadataSuggestionTag[];
  metadataSources: MetadataSourceRecord[];
  metadataConfidence: number;
  metadataConfidenceLabel: "low" | "medium" | "high";
  confidenceReasons: string[];
  reviewRequired: boolean;
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
  suggestion: (MetadataSuggestion & {
    lastEnrichedAt: string | null;
    lastReviewedAt: string | null;
  }) | null;
}

export interface SeriesMetadataResponse {
  metadata: SeriesMetadataView;
  catalog: MetadataCatalog;
}

export interface RefreshSeriesMetadataRequest {
  externalId?: string | number;
  source?: MetadataSource;
  searchTitle?: string;
  anilistId?: number;
  workTypeHint?: WorkType;
}

export interface RefreshSeriesMetadataResponse {
  success: true;
  source: MetadataSource | null;
  matched: string;
  confidence: number;
  metadata: SeriesMetadataView;
}

export interface ReviewSeriesMetadataRequest {
  workType: WorkType;
  canonicalGenres: CanonicalGenre[];
  themes: ThemeCode[];
  audience: AudienceCode[];
  titleAliases?: string[];
  description?: string | null;
  author?: string | null;
  artist?: string | null;
  status?: string | null;
}

export interface ReviewSeriesMetadataResponse {
  success: true;
  metadata: SeriesMetadataView;
}

export interface MetadataSearchResponse {
  query: string;
  workTypeHint: WorkType | null;
  count: number;
  sources: MetadataSource[];
  suggestion: MetadataSuggestion | null;
  results: MetadataProviderCandidate[];
}
