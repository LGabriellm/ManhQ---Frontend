// Tipos da API ManhQ

// ===== Autenticação =====
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token?: string;
}

export interface RegisterResponse {
  message: string;
  userId: string;
}

// ===== Ativação de Conta =====
export interface ValidateTokenResponse {
  valid: boolean;
  email?: string;
  name?: string;
  error?: string;
}

export interface ActivateAccountRequest {
  token: string;
  password: string;
}

export interface ActivateAccountResponse {
  success: boolean;
  message: string;
  user: User;
  token?: string;
}

// ===== Recuperação de Senha =====
export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

// ===== Séries e Mídias =====
export interface Media {
  id: string;
  title: string;
  type: "CHAPTER" | "VOLUME";
  number: number;
  pageCount: number;
  coverUrl?: string;
  seriesId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Series {
  id: string;
  title: string;
  alternativeTitle?: string;
  description?: string;
  author?: string;
  artist?: string;
  status?: "ONGOING" | "COMPLETED" | "HIATUS" | "CANCELLED" | null;
  coverUrl?: string | null;
  coverPath?: string | null;
  genres?: string[];
  tags?: string[] | null;
  year?: number;
  rating?: number;
  createdAt?: string;
  updatedAt?: string;
  medias?: Media[];
  _count?: {
    medias: number;
  };
}

export interface SeriesCoverUpdateResponse {
  success: boolean;
  seriesId: string;
  coverUrl: string;
  source: "chapter" | "upload";
  mediaId?: string;
}

// ===== Comunidade =====
export type CommentType =
  | "DISCUSSION"
  | "SPOILER_WARNING"
  | "THEORY"
  | "CORRECTION"
  | "TRANSLATION"
  | "ARTWORK";

export interface CommunityUser {
  id: string;
  name: string;
  username?: string;
  avatarKey?: string | null;
}

export interface CommentItem {
  id: string;
  userId: string;
  user?: CommunityUser;
  seriesId: string;
  mediaId?: string | null;
  title?: string | null;
  content: string;
  type: CommentType;
  hasSpoilers: boolean;
  approved: boolean;
  moderated?: boolean;
  pinnedAt?: string | null;
  helpful: number;
  unhelpful: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommentsResponse {
  comments: CommentItem[];
  total: number;
}

export interface CommentQueryParams {
  sortBy?: "recent" | "helpful" | "controversial";
  limit?: number;
  offset?: number;
  type?: CommentType;
  hasSpoilers?: boolean;
}

export interface CreateCommentRequest {
  title?: string;
  content: string;
  type: CommentType;
  hasSpoilers?: boolean;
}

export interface UpdateCommentRequest {
  title?: string;
  content?: string;
  hasSpoilers?: boolean;
}

export interface VoteCommentRequest {
  value: -1 | 0 | 1;
}

export interface CommentVoteResponse {
  helpful: number;
  unhelpful: number;
  updatedAt: string;
}

// ===== Leitor =====
export interface ChapterInfo {
  id: string;
  title: string;
  number: number;
  pageCount: number;
  type?: string;
  series: {
    id: string;
    title: string;
  };
  nextChapter: {
    id: string;
    number: number;
  } | null;
  prevChapter: {
    id: string;
    number: number;
  } | null;
}

export interface ReadProgressRequest {
  page: number;
}

export interface ReadProgress {
  id: string;
  page: number;
  finished: boolean;
  readCount: number;
  lastReadAt: string;
  media?: {
    id: string;
    title: string;
    number: number;
    pageCount: number;
    series?: {
      id: string;
      title: string;
      coverPath?: string;
    };
  };
}

// ===== Coleções =====
export interface Collection {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  items?: CollectionItem[];
  _count?: {
    items: number;
  };
}

export interface CollectionItem {
  id: string;
  collectionId: string;
  seriesId: string;
  note?: string | null;
  order: number;
  createdAt?: string;
  addedAt?: string;
  series?: Series;
}

export interface CreateCollectionRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export interface UpdateCollectionRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

export interface AddItemToCollectionRequest {
  seriesId: string;
  note?: string;
}

export interface ReorderCollectionRequest {
  items: {
    itemId: string;
    order: number;
  }[];
}

// ===== Notificações =====
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

// ===== Estatísticas do Usuário =====
export interface UserReadingStats {
  chaptersRead: number;
  chaptersInProgress: number;
  totalChaptersTouched: number;
  totalPagesRead: number;
  totalRereads: number;
  seriesStarted: number;
  seriesCompleted: number;
  completionRate: number;
  avgPagesPerChapter: number;
}

export interface UserLibraryStats {
  totalSeriesInLibrary: number;
  totalChaptersInLibrary: number;
  totalPagesInLibrary: number;
  seriesExplored: number;
  chaptersExplored: number;
  libraryExploredPercent: number;
  favorites: number;
  reading: number;
  history: number;
}

export interface UserStreakStats {
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  isActiveToday: boolean;
}

export interface DayOfWeekStats {
  day: string;
  pages: number;
  time: number;
}

export interface UserTimeStats {
  totalTimeSeconds: number;
  totalTimeFormatted: string;
  avgTimePerDaySeconds: number;
  avgTimePerDayFormatted: string;
  totalPagesReadFromStats: number;
  avgPagesPerDay: number;
  totalChaptersCompleted: number;
  avgChaptersPerDay: number;
  mostProductiveDay: string;
  pagesPerDayOfWeek: DayOfWeekStats[];
  memberSinceDays: number;
}

export interface GenreDistribution {
  tag: string;
  count: number;
  percent: number;
}

export interface UserGenreStats {
  favoriteGenre: string;
  topGenres: GenreDistribution[];
  allGenres: GenreDistribution[];
  totalGenresExplored: number;
}

export interface TopSeriesStats {
  id: string;
  title: string;
  coverUrl: string | null;
  tags: string;
  totalChapters: number;
  chaptersRead: number;
  pagesRead: number;
  rereads: number;
  progressPercent: number;
  lastReadAt: string;
}

export interface Milestone {
  id: string;
  category: string;
  title: string;
  target: number;
  current: number;
  achieved: boolean;
  percent: number;
}

export interface UserMilestoneStats {
  total: number;
  achieved: number;
  next: Milestone | null;
  all: Milestone[];
}

export interface UserStatsResponse {
  reading: UserReadingStats;
  library: UserLibraryStats;
  streaks: UserStreakStats;
  time: UserTimeStats;
  genres: UserGenreStats;
  topSeries: TopSeriesStats[];
  milestones: UserMilestoneStats;
}

// ===== Sessões =====
export interface Session {
  id: string;
  ipAddress: string;
  userAgent?: string;
  createdAt: string;
  lastUsedAt: string;
}

// ===== API Status =====
export interface ApiStatus {
  status: string;
  version: string;
}

// ===== Health Check =====
export interface HealthCheck {
  status: "healthy" | "unhealthy";
  database: boolean;
  redis: boolean;
  timestamp: string;
}

// ===== Paginação =====
export interface PaginatedRequest {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

// ===== Erro da API =====
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  statusCode: number;
  // Campos adicionais para erros de validação
  error?: string; // Mensagem de erro específica (ex: validação de senha)
  details?: string[]; // Array de detalhes dos erros
  retryAfter?: number; // Tempo em ms para retry (rate limiting)
}

// ===== Listas do Usuário =====
export interface SeriesStatus {
  isFavorite: boolean;
  isReading: boolean;
  inHistory: boolean;
  categories: string[];
}

export interface ToggleListRequest {
  seriesId: string;
}

// ===== Progresso de Leitura =====
export interface MediaProgress {
  page: number;
  finished: boolean;
  startedAt: string;
  lastReadAt: string;
  readCount: number;
}

// ===== Account & Perfil Expandido (API v2.1) =====
export interface Account {
  id: string;
  name: string;
  username: string;
  email: string;
  bio?: string | null;
  website?: string | null;
  location?: string | null;
  avatarUrl?: string | null;
  role: string;
  subStatus: string;
  subExpiresAt?: string | null;
  maxDevices: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  readingMode: "SINGLE" | "DOUBLE" | "CONTINUOUS";
  readingDir: "LTR" | "RTL";
  autoNext: boolean;
  theme: "DARK" | "LIGHT" | "SEPIA";
  brightness: number;
  language: string;
  timezone: string;
  imageQuality: "LOW" | "MEDIUM" | "HIGH";
  prefetch: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  notifyNewChapters: boolean;
  notifySeriesComplete: boolean;
  isProfilePublic: boolean;
  showReadingStats: boolean;
  showCommunityProfile: boolean;
}

export interface AccountResponse {
  account: Account;
  preferences: UserPreferences;
}

export interface UpdateProfileRequest {
  name?: string;
  username?: string;
  bio?: string;
  website?: string;
  location?: string;
}

export interface UpdateProfileResponse {
  profile: Account;
}

export interface UpdatePreferencesRequest {
  readingMode?: string;
  readingDir?: string;
  autoNext?: boolean;
  theme?: string;
  brightness?: number;
  language?: string;
  timezone?: string;
  imageQuality?: string;
  prefetch?: number;
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  notifyNewChapters?: boolean;
  notifySeriesComplete?: boolean;
  isProfilePublic?: boolean;
  showReadingStats?: boolean;
  showCommunityProfile?: boolean;
}

export interface UpdatePreferencesResponse {
  preferences: Partial<UserPreferences>;
}

export interface ChangeEmailRequest {
  currentPassword: string;
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UsernameCheckResponse {
  username: string;
  available: boolean;
  suggestions: string[];
}

export interface AvatarUploadResponse {
  profile: Pick<Account, "id" | "name" | "avatarUrl">;
}

export interface AvatarRemoveResponse {
  profile: Pick<Account, "id" | "avatarUrl">;
}

export interface SeriesProgress {
  seriesId?: string;
  totalChapters: number;
  readChapters: number;
  chaptersRead?: number;
  chaptersInProgress?: number;
  completionPercentage: number;
  progressPercent?: number;
  chapters?: Array<{
    mediaId: string;
    number: number;
    title: string;
    page: number;
    pageCount: number;
    finished: boolean;
    readCount: number;
    lastReadAt: string;
  }>;
}

export interface ContinueReadingItem {
  progressId: string | null;
  mediaId: string;
  mediaTitle: string;
  mediaNumber: number;
  seriesId: string;
  seriesTitle: string;
  coverUrl: string;
  page: number;
  pageCount: number;
  percent: number;
  finished: boolean;
  lastReadAt: string;
  startedAt: string | null;
  type: "in-progress" | "next-chapter";
}

export interface ProgressHistoryItem {
  progressId: string;
  mediaId: string;
  mediaTitle: string;
  mediaNumber: number;
  seriesId: string;
  seriesTitle: string;
  coverUrl: string;
  page: number;
  pageCount: number;
  percent: number;
  finished: boolean;
  startedAt: string;
  lastReadAt: string;
  completedAt: string | null;
  readCount: number;
}

export interface ProgressHistoryResponse {
  items: ProgressHistoryItem[];
  total: number;
  hasMore: boolean;
}

export interface ContinueReadingParams {
  limit?: number;
  onlyInProgress?: boolean;
}

export interface ProgressHistoryParams {
  limit?: number;
  offset?: number;
  onlyCompleted?: boolean;
}

// ===== Admin Dashboard =====
export interface AdminOverview {
  totalSeries: number;
  totalChapters: number;
  totalUsers: number;
  totalPages: number;
}

export interface AdminHealth {
  seriesWithoutMeta: number;
  seriesWithoutTags: number;
  seriesWithoutCover: number;
  metadataCompleteness: number;
}

export interface AdminRecentSeries {
  id: string;
  title: string;
  description?: string;
  tags?: string;
  author?: string;
  status?: string;
  coverPath?: string;
  createdAt: string;
  coverUrl?: string;
  chaptersCount: number;
}

export interface AdminDashboardResponse {
  overview: AdminOverview;
  health: AdminHealth;
  recentSeries: AdminRecentSeries[];
}

// ===== Admin Series Management =====
export interface AdminSeriesItem {
  id: string;
  title: string;
  description?: string;
  author?: string;
  artist?: string;
  status?: string;
  tags?: string;
  coverPath?: string;
  coverUrl?: string;
  sourceType?: string;
  createdAt: string;
  updatedAt: string;
  chaptersCount: number;
  hasDescription: boolean;
  hasTags: boolean;
  hasCover: boolean;
}

export interface AdminSeriesListResponse {
  series: AdminSeriesItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AdminSeriesParams {
  page?: number;
  limit?: number;
  search?: string;
  missingMeta?: boolean;
}

export interface UpdateSeriesRequest {
  title?: string;
  description?: string;
  author?: string;
  artist?: string;
  status?: string;
  tags?: string;
}

// ===== Metadata (Multi-fonte) =====
export interface MetadataResult {
  externalId: number | string;
  source: "anilist" | "mangadex" | "wikipedia" | "comicvine";
  title: string;
  titleEnglish?: string;
  titleNative?: string;
  titlePortuguese?: string;
  titleRomaji?: string;
  alternativeTitles?: string[];
  description?: string;
  genres?: string[];
  tags?: string[];
  author?: string;
  artist?: string;
  status?: string;
  chapters?: number | null;
  volumes?: number | null;
  startYear?: number | null;
  endYear?: number | null;
  averageScore?: number;
  popularity?: number;
  coverUrlLarge?: string;
  coverUrlMedium?: string;
  bannerUrl?: string;
  isAdult?: boolean;
  countryOfOrigin?: string;
  matchConfidence?: number;
}

/** @deprecated Use MetadataResult */
export type AniListResult = MetadataResult;

export interface MetadataSearchResponse {
  query: string;
  count: number;
  sources: string[];
  results: MetadataResult[];
}

/** @deprecated Use MetadataSearchResponse */
export type AniListSearchResponse = MetadataSearchResponse;

export interface MetadataProvider {
  name: string;
  displayName: string;
  available: boolean;
}

export interface MetadataProvidersResponse {
  providers: MetadataProvider[];
}

export interface EnrichSeriesRequest {
  externalId?: number | string;
  source?: string;
  anilistId?: number;
  searchTitle?: string;
}

export interface EnrichSeriesResponse {
  success: boolean;
  source: string;
  matched?: string;
  confidence?: number;
  series: Series;
}

// ===== Jobs =====
export type JobState =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed";

export interface AdminJob {
  id: string;
  name: string;
  data?: {
    tempPath?: string;
    safeName?: string;
    originalName?: string;
  };
  state: JobState;
  progress?: number;
  priority?: number;
  result?: {
    seriesTitle?: string;
    chapter?: number;
    finalPath?: string;
    duplicate?: boolean;
    stats?: {
      originalSize?: number;
      optimizedSize?: number;
      filesProcessed?: number;
      filesConverted?: number;
      filesSkipped?: number;
      conversionTime?: number;
      compressionRatio?: number;
    };
  };
  error?: string;
  logs?: string[];
  attempts?: number;
  maxAttempts?: number;
  createdAt?: number;
  startedAt?: number;
  processedAt?: number;
  finishedAt?: number;
  failedAt?: number;
  duration?: number;
}

export interface JobsStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}

export interface JobsResponse {
  success: boolean;
  stats: JobsStats;
  jobs:
    | {
        waiting: AdminJob[];
        active: AdminJob[];
        delayed: AdminJob[];
        completed?: AdminJob[];
        failed?: AdminJob[];
      }
    | AdminJob[];
}

export interface JobDetailResponse {
  success: boolean;
  job: AdminJob;
}

export interface JobLogsResponse {
  success: boolean;
  jobId: string;
  logs: string[];
  count: number;
}

// ===== Upload =====
export interface UploadResponse {
  success: boolean;
  message: string;
  jobId: string;
  filename: string;
}

export interface UploadBulkResponse {
  success: boolean;
  message: string;
  accepted: { filename: string; jobId: string }[];
  rejected: { filename: string; reason: string }[];
}

export interface UploadFolderResponse {
  success: boolean;
  message: string;
  folderName: string;
  seriesTitle: string;
  accepted: {
    filename: string;
    jobId: string;
    size: number;
    hash: string;
  }[];
  rejected: { filename: string; reason: string }[];
  totalReceived: number;
}

export interface UploadSerieSingleResponse {
  success: boolean;
  message: string;
  seriesId: string;
  seriesTitle: string;
  jobId: string;
  filename: string;
}

export interface UploadSerieMultiResponse {
  success: boolean;
  message: string;
  seriesId: string;
  seriesTitle: string;
  accepted: {
    filename: string;
    jobId: string;
    size: number;
    hash: string;
  }[];
  rejected: { filename: string; reason: string }[];
  totalReceived: number;
}

export type UploadSerieResponse =
  | UploadSerieSingleResponse
  | UploadSerieMultiResponse;

export type UploadDecision = "EXISTING_SERIES" | "NEW_SERIES" | "SKIP";

export interface UploadPlanPatch {
  decision?: UploadDecision;
  targetSeriesId?: string;
  newSeriesTitle?: string;
  chapterNumber?: number;
  volume?: number | null;
  year?: number | null;
  isOneShot?: boolean;
  tags?: string[];
  description?: string;
  status?: string;
  author?: string;
  artist?: string;
}

export interface UploadDraftParsedData {
  originalTitle: string;
  normalizedTitle: string;
  number: number;
  volume: number | null;
  year: number | null;
  isOneShot: boolean;
}

export interface UploadDraftSuggestionData {
  existingSeriesMatch: boolean;
  confidence: "high" | "medium" | "low";
  matchedSeriesId?: string;
  matchedSeriesTitle?: string;
}

export interface UploadDraftItem {
  id: string;
  source: "LOCAL" | "GOOGLE_DRIVE";
  originalName: string;
  parsed: UploadDraftParsedData;
  suggestion: UploadDraftSuggestionData;
  plan: {
    decision?: UploadDecision;
    targetSeriesId?: string;
    newSeriesTitle?: string;
    chapterNumber?: number;
    volume?: number | null;
    year?: number | null;
    isOneShot?: boolean;
    tags: string[];
    description: string;
    status: string;
    author: string;
    artist: string;
  };
}

export interface UploadDraftRejectedItem {
  fileId?: string;
  filename?: string;
  reason: string;
}

export interface LocalUploadStageResponse {
  success: boolean;
  stage: "analyzed";
  draftId: string;
  expiresAt: number;
  folderName?: string | null;
  totalReceived: number;
  items: UploadDraftItem[];
  rejected: UploadDraftRejectedItem[];
  nextStep: string;
  processing?: {
    state: "processing" | "completed" | "failed";
    totalReceived: number;
    analyzedCount: number;
    acceptedCount: number;
    rejectedCount: number;
    error?: string;
  };
}

export interface LocalUploadDraftResponse {
  success: boolean;
  draft: {
    id: string;
    source: "LOCAL";
    createdAt: number;
    expiresAt: number;
    items: UploadDraftItem[];
    processing?: {
      state: "processing" | "completed" | "failed";
      totalReceived: number;
      analyzedCount: number;
      acceptedCount: number;
      rejectedCount: number;
      error?: string;
    };
  };
}

export interface UploadDraftItemUpdateResponse {
  success: boolean;
  item: {
    id: string;
    plan: UploadPlanPatch;
  };
}

export interface UploadDraftCancelResponse {
  success: boolean;
  canceled: boolean;
}

export interface UploadDraftConfirmResponse {
  success: boolean;
  message?: string;
  accepted: Array<{
    itemId: string;
    fileId?: string;
    filename: string;
    jobId: string;
  }>;
  rejected: Array<{
    itemId: string;
    fileId?: string;
    filename: string;
    reason: string;
  }>;
  skipped: Array<{
    itemId: string;
    filename: string;
  }>;
  totals: {
    accepted: number;
    rejected: number;
    skipped: number;
  };
}

// ===== Google Drive Integration =====
export interface GoogleDriveAccount {
  email?: string;
  name?: string;
  picture?: string;
}

export interface GoogleDriveAuthUrlResponse {
  url: string;
}

export interface GoogleDriveStatusResponse {
  connected: boolean;
  account?: GoogleDriveAccount;
}

export interface GoogleDriveCallbackResponse {
  success: boolean;
  connected: boolean;
  account?: GoogleDriveAccount;
}

export interface GoogleDriveDisconnectResponse {
  success?: boolean;
  connected?: boolean;
  message?: string;
}

export interface GoogleDriveFolderItem {
  id: string;
  name: string;
  mimeType: "application/vnd.google-apps.folder" | string;
  driveId?: string | null;
  modifiedTime?: string | null;
  shared?: boolean;
  ownedByMe?: boolean | null;
  owners?: Array<{
    displayName?: string | null;
    emailAddress?: string | null;
  }>;
}

export interface GoogleDriveFoldersResponse {
  folders: GoogleDriveFolderItem[];
  nextPageToken?: string;
}

export interface GoogleDriveFoldersParams {
  parentId?: string;
  pageToken?: string;
  pageSize?: number;
}

export interface GoogleDriveNodeFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string | null;
  modifiedTime?: string | null;
  parents?: string[];
  driveId?: string | null;
  supported: boolean;
}

export interface GoogleDriveNodesResponse {
  success: boolean;
  folders: Array<{
    id: string;
    name: string;
  }>;
  files: GoogleDriveNodeFile[];
  nextPageToken?: string | null;
}

export interface GoogleDriveNodesParams {
  parentId: string;
  pageToken?: string;
  maxFiles?: number;
  pageSize?: number;
}

export interface GoogleDriveStageRequest {
  folderId: string;
  fileIds?: string[];
  recursive?: boolean;
  maxFiles?: number;
  forcedSeriesTitle?: string;
}

export interface GoogleDriveStageResponse {
  success: boolean;
  draftId: string;
  expiresAt: number;
  items: UploadDraftItem[];
  rejected: UploadDraftRejectedItem[];
  nextStep: string;
}

export interface GoogleDriveDraftResponse {
  success: boolean;
  draft: {
    id: string;
    source: "GOOGLE_DRIVE";
    createdAt: number;
    expiresAt: number;
    items: UploadDraftItem[];
  };
}

export interface GoogleDriveConfirmDraftResponse {
  success: boolean;
  accepted: Array<{
    itemId: string;
    fileId: string;
    filename: string;
    jobId: string;
  }>;
  rejected: Array<{
    itemId: string;
    fileId?: string;
    filename: string;
    reason: string;
  }>;
  skipped: Array<{
    itemId: string;
    filename: string;
  }>;
  totals: {
    accepted: number;
    rejected: number;
    skipped: number;
  };
}

// ===== Analytics / Stats Recording =====
export interface RecordStatsRequest {
  pages: number;
  timeSpent: number;
  chapterCompleted?: boolean;
}

export interface DailyStats {
  id: string;
  date: string;
  pagesRead: number;
  timeSpent: number;
  chaptersCompleted: number;
}

export interface StatsWeekResponse {
  stats: DailyStats[];
  totals: {
    pagesRead: number;
    timeSpent: number;
    chaptersCompleted: number;
  };
  avg: {
    pagesPerDay: number;
    timePerDay: number;
    chaptersPerDay: string;
  };
}

export interface StatsDashboardResponse {
  thisWeek: {
    pagesRead: number;
    timeSpent: number;
    chaptersCompleted: number;
    avg: {
      pagesPerDay: number;
      timePerDay: number;
      chaptersPerDay: string;
    };
  };
  thisMonth: {
    pagesRead: number;
    timeSpent: number;
    chaptersCompleted: number;
    avg: {
      pagesPerDay: number;
      timePerDay: number;
      chaptersPerDay: string;
    };
  };
  allTime: {
    totals: {
      pagesRead: number;
      timeSpent: number;
      chaptersCompleted: number;
    };
    favoriteGenre: string;
    topSeries: {
      series: {
        id: string;
        title: string;
        coverUrl: string;
      };
      chaptersRead: number;
    }[];
    daysActive: number;
  };
}

// ===== Admin — Media Management =====
export interface ReassignMediaRequest {
  targetSeriesId?: string;
  newSeriesTitle?: string;
  number?: number;
  volume?: number;
}

export interface ReassignMediaResponse {
  success: boolean;
  message: string;
  media: {
    id: string;
    title: string;
    number: number;
    volume?: number;
    seriesId: string;
  };
  sourceSeriesDeleted: boolean;
}

export interface UpdateMediaRequest {
  title?: string;
  number?: number;
  volume?: number;
  year?: number;
}

export interface UpdateMediaResponse {
  success: boolean;
  media: {
    id: string;
    title: string;
    number: number;
    volume?: number;
    year?: number;
  };
}

export interface MergeSeriesRequest {
  sourceSeriesId: string;
  targetSeriesId: string;
  deleteSource?: boolean;
}

export interface MergeSeriesResponse {
  success: boolean;
  movedCount: number;
  sourceDeleted: boolean;
  target: {
    id: string;
    title: string;
    totalChapters: number;
  };
}

export interface ParsePreviewResponse {
  filename: string;
  parsed: {
    title: string;
    normalizedTitle: string;
    number: number | null;
    volume: number | null;
    year: number | null;
    isOneShot: boolean;
  };
}

// ===== Blocked IPs =====

// ===== Admin — Media Management (New Endpoints) =====
export interface AdminMediaItem {
  id: string;
  title: string;
  number: number;
  volume: number | null;
  year: number | null;
  extension: string;
  size: number;
  path: string;
  pageCount: number;
  isReady: boolean;
  isOneShot: boolean;
  createdAt: string;
  fileExists: boolean;
  seriesId: string;
  seriesTitle: string;
  seriesCoverUrl: string;
}

export interface AdminMediaListParams {
  page?: number;
  limit?: number;
  search?: string;
  seriesId?: string;
  extension?: string;
  sort?: "title" | "number" | "size" | "pageCount" | "createdAt" | "updatedAt";
  order?: "asc" | "desc";
  orphan?: boolean;
}

export interface AdminMediaListResponse {
  medias: AdminMediaItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface AdminMediaPage {
  index: number;
  filename: string;
  mimeType: string;
}

export interface AdminMediaPageDetailed {
  index: number;
  filename: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
}

export interface AdminMediaDetail {
  id: string;
  title: string;
  number: number;
  volume: number | null;
  year: number | null;
  extension: string;
  size: number;
  path: string;
  pageCount: number;
  isReady: boolean;
  createdAt: string;
  series: {
    id: string;
    title: string;
    coverPath?: string;
  };
  fileExists: boolean;
  pages: AdminMediaPage[];
  readProgress: {
    userId: string;
    page: number;
    finished: boolean;
    updatedAt: string;
  }[];
  readersCount: number;
}

export interface AdminMediaPagesResponse {
  mediaId: string;
  title: string;
  totalPages: number;
  pages: AdminMediaPageDetailed[];
}

export interface DeletePagesResponse {
  success: boolean;
  message: string;
  details: {
    pagesDeleted: number;
    deletedPages: number[];
    remainingPages: number;
    newSize: number;
  };
}

export interface ReorderPagesResponse {
  success: boolean;
  message: string;
  details: {
    totalPages: number;
    newOrder: number[];
  };
}

export interface AddPagesResponse {
  success: boolean;
  message: string;
  details: {
    pagesAdded: number;
    insertedAt: number;
    totalPages: number;
  };
}

export interface ReplacePageResponse {
  success: boolean;
  message: string;
}

export interface SplitMediaRequest {
  splitAfterPage: number;
  newTitle?: string;
  newNumber?: number;
}

export interface SplitMediaResponse {
  success: boolean;
  message: string;
  original: {
    id: string;
    title: string;
    pages: number;
  };
  newChapter: {
    id: string;
    title: string;
    number: number;
    pages: number;
    path: string;
  };
}

export interface BulkDeleteMediaRequest {
  mediaIds: string[];
  deleteFiles?: boolean;
}

export interface BulkDeleteMediaResponse {
  success: boolean;
  message: string;
  details: {
    totalDeleted: number;
    totalFilesDeleted: number;
    results: {
      id: string;
      title: string;
      success: boolean;
      error?: string;
    }[];
  };
}

export interface BulkMoveMediaRequest {
  mediaIds: string[];
  targetSeriesId: string;
}

export interface BulkMoveMediaResponse {
  success: boolean;
  message: string;
  details: {
    totalMoved: number;
    targetSeries: string;
    results: {
      id: string;
      title: string;
      success: boolean;
      fromSeries?: string;
    }[];
    emptiedSeries?: {
      message: string;
      series: string[];
    };
  };
}

// Stats all-time (standalone endpoint)
export interface StatsAllTimeResponse {
  totals: {
    pagesRead: number;
    timeSpent: number;
    chaptersCompleted: number;
  };
  favoriteGenre: string;
  topSeries: {
    series: {
      id: string;
      title: string;
      coverUrl: string;
    };
    chaptersRead: number;
  }[];
  daysActive: number;
}

// Legacy progress stats
export interface ProgressStats {
  totalChaptersRead: number;
  totalPagesRead: number;
  totalSeriesStarted: number;
  totalSeriesCompleted: number;
  averagePagesPerChapter: number;
}

// ===== API Health Check =====
export interface ApiHealthResponse {
  status: string;
  version?: string;
  uptime?: number;
}

// ===== Scan Jobs =====
export interface ScanJob {
  id: string;
  state: JobState;
  progress?: number;
  data?: {
    incremental?: boolean;
  };
  result?: {
    totalFiles?: number;
    newSeries?: number;
    newChapters?: number;
    updatedSeries?: number;
    errors?: number;
  };
  error?: string;
  createdAt?: number;
  startedAt?: number;
  finishedAt?: number;
  duration?: number;
}

export interface ScanJobsResponse {
  jobs: ScanJob[];
}

// ===== Bulk Delete Series =====
export interface BulkDeleteSeriesRequest {
  seriesIds: string[];
  deleteFiles?: boolean;
}

export interface BulkDeleteSeriesResponse {
  success: boolean;
  message: string;
  details: {
    totalDeleted: number;
    results: {
      id: string;
      title: string;
      success: boolean;
      error?: string;
    }[];
  };
}

// ===== Jobs Queue Control =====
export interface JobQueueControlResponse {
  success: boolean;
  message: string;
}

// ===== SSE Job Progress Event =====
export interface JobProgressEvent {
  type: "progress" | "completed" | "failed" | "stalled" | "active";
  jobId: string;
  name?: string;
  progress?: number;
  result?: AdminJob["result"];
  error?: string;
  timestamp: number;
}

export interface BlockedIP {
  ip: string;
  attempts: number;
  blockedAt: string;
  blockedUntil: string;
}

export interface BlockedIPsResponse {
  count: number;
  ips: BlockedIP[];
}

export interface IPInfo {
  ip: string;
  attempts: number;
  lastAttempt: string;
  isBlocked: boolean;
  blockedUntil?: string;
}

// ===== Admin — User Management =====
export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  subStatus: string;
  subExpiresAt: string | null;
  maxDevices: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    sessions: number;
    readProgress: number;
    submittedApprovals: number;
  };
}

export interface AdminUserDetail extends AdminUserItem {
  sessions: { id: string; device: string; lastUsed: string }[];
  recentSubmissions: ApprovalItem[];
}

export interface AdminUsersListResponse {
  users: AdminUserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUsersParams {
  search?: string;
  role?: string;
  subStatus?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface AdminUsersStatsResponse {
  totalUsers: number;
  byRole: Record<string, number>;
  byStatus: Record<string, number>;
  activeEditors: number;
  recentUsers: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role?: string;
  subStatus?: string;
}

export interface UpdateUserRequest {
  name?: string;
  role?: string;
  subStatus?: string;
  maxDevices?: number;
  password?: string;
}

export interface CreateUserResponse {
  message: string;
  user: AdminUserItem;
}

export interface RevokeSessionsResponse {
  message: string;
  sessionsRevoked: number;
}

// ===== Admin — Content Approvals =====
export interface ApprovalItem {
  id: string;
  submitter: { id: string; name: string; email: string };
  status: "PENDING" | "APPROVED" | "REJECTED";
  originalName: string;
  safeName: string;
  fileSize: number;
  fileHash: string;
  targetSeriesId: string | null;
  forcedSeriesTitle: string | null;
  reviewer: { id: string; name: string } | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface ApprovalsListResponse {
  approvals: ApprovalItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApprovalsParams {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  page?: number;
  limit?: number;
  submitterId?: string;
}

export interface ApprovalsStatsResponse {
  pending: number;
  approved: number;
  rejected: number;
  todayPending: number;
}

export interface ApproveResponse {
  message: string;
  jobId: string;
  approval: {
    id: string;
    originalName: string;
    submitter: { id: string; name: string };
  };
}

export interface RejectRequest {
  reason: string;
}

export interface BulkApproveRequest {
  ids: string[];
}

export interface BulkApproveResponse {
  message: string;
  approved: { id: string; originalName: string; jobId: string }[];
  failed: { id: string; error: string }[];
}

export interface BulkRejectRequest {
  ids: string[];
  reason: string;
}

export interface BulkRejectResponse {
  message: string;
  rejected: { id: string; originalName: string }[];
  failed: { id: string; error: string }[];
}

// ===== Editor — My Submissions =====
export interface SubmissionItem {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  originalName: string;
  fileSize: number;
  createdAt: string;
  reviewer: { id: string; name: string } | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export interface SubmissionsListResponse {
  submissions: SubmissionItem[];
  pendingCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ===== Admin — Gerenciamento de Assinaturas =====
export interface SubscriptionItem {
  id: string;
  provider: string;
  plan: string;
  status: "ACTIVE" | "PAST_DUE" | "CANCELED" | "REFUNDED" | "EXPIRED";
  startsAt: string;
  currentPeriodEnd: string;
  amount: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    subStatus: string;
  };
}

export interface SubscriptionsListResponse {
  subscriptions: SubscriptionItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SubscriptionsParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface SubscriptionsStatsResponse {
  totalSubscriptions: number;
  active: number;
  canceled: number;
  pastDue: number;
  refunded: number;
  pendingActivations: number;
  recentEvents: {
    id: string;
    event: string;
    provider: string;
    processedAt: string;
    subscription: {
      id: string;
      user: { email: string; name: string };
    };
  }[];
}

export interface ActivationTokenItem {
  id: string;
  email: string;
  name: string;
  status: "PENDING" | "USED" | "EXPIRED" | "REVOKED";
  provider: string;
  externalId: string;
  productName: string;
  amount: number;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface ActivationTokensResponse {
  tokens: ActivationTokenItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ActivationTokensParams {
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateManualSubscriptionRequest {
  email: string;
  name: string;
  sendActivation?: boolean;
  password?: string;
}

export interface CreateManualSubscriptionResponse {
  action: "activation_sent" | "account_created";
  tokenId?: string;
  userId?: string;
}

export interface CancelSubscriptionRequest {
  reason?: string;
}

export interface CheckExpiredResponse {
  success: boolean;
  expiredCount: number;
  message: string;
}

// ===== Approval Detail =====
export interface ApprovalDetail extends ApprovalItem {
  fileExists: boolean;
}
