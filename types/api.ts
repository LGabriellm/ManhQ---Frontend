// Tipos da API ManhQ
import type { MetadataSourceRecord } from "@/types/metadata";
import type {
  UploadApprovalListItem,
  UploadJob,
  UploadSessionStatus,
} from "@/types/upload";

// ===== Autenticação =====
export type SubscriptionStatus =
  | "ACTIVE"
  | "SETUP_PENDING"
  | "PAST_DUE"
  | "CANCELLATION_REQUESTED"
  | "CANCELED"
  | "REFUNDED"
  | "EXPIRED";

export type SubscriptionState =
  | "inactive"
  | "setup_pending"
  | "active"
  | "nearing_expiration"
  | "renewal_pending"
  | "past_due"
  | "cancelled"
  | "expired"
  | "refunded";

export interface SubscriptionReminder {
  lastSentAt: string | null;
  lastSentDays: number | null;
  nextReminderWindowDays: number | null;
}

export interface SubscriptionActions {
  canCancel: boolean;
  canRenew: boolean;
}

export interface SubscriptionView {
  id?: string;
  provider?: string;
  plan?: string;
  status?: SubscriptionStatus;
  state: SubscriptionState;
  accessGranted: boolean;
  paymentMethod?: string | null;
  isRecurring?: boolean | null;
  buyerEmail?: string;
  buyerName?: string | null;
  startsAt?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  cancellationRequestedAt?: string | null;
  cancellationEffectiveAt?: string | null;
  canceledAt?: string | null;
  cancelReason?: string | null;
  lastPaymentConfirmedAt?: string | null;
  setupCompletedAt?: string | null;
  renewalUrl?: string | null;
  reminder?: SubscriptionReminder;
  actions: SubscriptionActions;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    subStatus?: string | null;
  };
  amount?: number | null;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  username?: string | null;
  subStatus?: string | null;
  subExpiresAt?: string | null;
  maxDevices?: number;
  createdAt?: string;
  subscription?: SubscriptionView;
  subscriptionState?: SubscriptionState;
  accessGranted?: boolean;
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
  subscription?: SubscriptionView;
  subscriptionState?: SubscriptionState;
  accessGranted?: boolean;
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
  expiresAt?: string;
  suggestedUsername?: string;
  subscription?: SubscriptionView;
  error?: string;
}

export interface ActivateAccountRequest {
  token: string;
  password: string;
  username?: string;
  name?: string;
}

export interface ActivatedUser {
  id: string;
  email: string;
  name?: string | null;
  username?: string | null;
}

export interface ActivateAccountResponse {
  success: boolean;
  message: string;
  user: ActivatedUser;
  alreadyActivated?: boolean;
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

// ===== Badges =====
export type BadgeType =
  | "FOUNDER"
  | "EARLY_SUPPORTER"
  | "PREMIUM_MEMBER"
  | "TOP_READER"
  | "STREAK_MASTER"
  | "COMMUNITY_CONTRIBUTOR"
  | "VERIFIED_CREATOR"
  | "ADMIN_STAFF"
  | "CREATOR"
  | "MODERATOR"
  | "COLLECTOR"
  | "LEGENDARY_READER";

export interface UserBadgeResponse {
  id: string;
  type: BadgeType;
  name: string;
  description: string;
  icon: string;
  color: string;
  founderNumber: number | null;
  assignedAt: string;
}

export interface BadgesResponse {
  badges: UserBadgeResponse[];
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

export type SeriesWorkType =
  | "comic"
  | "manga"
  | "manhwa"
  | "webtoon"
  | "novel"
  | "light_novel"
  | "other";

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
  workType?: SeriesWorkType | null;
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

export interface CommentReplyItem {
  id: string;
  commentId: string;
  userId: string;
  user?: CommunityUser;
  content: string;
  hasSpoilers: boolean;
  approved: boolean;
  moderated?: boolean;
  helpful: number;
  unhelpful: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommentRepliesResponse {
  replies: CommentReplyItem[];
  total: number;
}

export interface CreateCommentReplyRequest {
  content: string;
  hasSpoilers?: boolean;
}

export interface UpdateCommentReplyRequest {
  content?: string;
  hasSpoilers?: boolean;
}

export interface ModerateCommentRequest {
  approved: boolean;
}

export interface CommentModerationCommentsResponse {
  comments: Array<CommentItem & { user: { name: string | null } }>;
  total: number;
}

export interface CommentModerationRepliesResponse {
  replies: Array<CommentReplyItem & { user: { name: string | null } }>;
  total: number;
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
  details?: string[] | Record<string, unknown>; // Array de detalhes ou objeto (ex: MAX_RETRIES_EXCEEDED)
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

// ===== Ratings & Reviews =====
export interface RatingRecord {
  id: string;
  userId: string;
  seriesId: string;
  score: number;
  review?: string | null;
  hasSpoilers?: boolean;
  helpful: number;
  verified?: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
  };
}

export interface RatingQueryParams {
  sortBy?: string;
  limit?: number;
  offset?: number;
  minScore?: number;
  maxScore?: number;
}

export interface RatingListResponse {
  ratings: RatingRecord[];
  total: number;
  count: number;
}

export interface RatingDistribution {
  one: number;
  two: number;
  three: number;
  four: number;
  five: number;
}

export interface RatingStats {
  total: number;
  average: number;
  distribution: RatingDistribution;
  mostHelpfulCount: number;
}

export interface RatingMutationResponse {
  message: string;
  rating: RatingRecord;
}

export interface HelpfulResponse {
  message: string;
  helpful: number;
}

export interface CreateRatingRequest {
  score: number;
  review?: string;
  hasSpoilers?: boolean;
}

export interface ReviewRecord {
  id: string;
  userId: string;
  seriesId: string;
  title?: string | null;
  content: string;
  rating?: number | null;
  hasSpoilers?: boolean;
  helpful: number;
  approved?: boolean;
  moderated?: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
  };
}

export interface ReviewQueryParams {
  sortBy?: string;
  limit?: number;
  offset?: number;
}

export interface ReviewListResponse {
  reviews: ReviewRecord[];
  total: number;
  count: number;
}

export interface CreateReviewRequest {
  title?: string;
  content: string;
  rating?: number;
  hasSpoilers?: boolean;
}

export interface UpdateReviewRequest {
  title?: string;
  content?: string;
  rating?: number;
  hasSpoilers?: boolean;
}

export interface ReviewMutationResponse {
  message: string;
  review: ReviewRecord;
}

// ===== Community =====
export interface CommunityBadge {
  id: string;
  title: string;
  description: string;
  rarity: string;
  category: string;
  icon: string;
  target: number;
  current: number;
  earned: boolean;
  progressPercent: number;
  code?: string;
  unlockedAt?: string;
}

export interface CommunityProfileSummary {
  userId: string;
  name: string;
  joinedAt: string;
  reputation: number;
  level: number;
}

export interface CommunityProfileMetrics {
  chaptersRead: number;
  totalPagesRead: number;
  seriesCompleted: number;
  longestStreak: number;
  favoritesCount: number;
  ratingsCount: number;
  reviewsCount: number;
  commentsCount: number;
  repliesCount: number;
  helpfulReceived: number;
  unhelpfulReceived: number;
}

export interface CommunityBadgeProgress {
  earned: CommunityBadge[];
  progress: CommunityBadge[];
  totalEarned: number;
  totalAvailable: number;
}

export interface CommunityRank {
  category: string;
  rank: number | null;
  score: number;
}

export interface CommunityProfileResponse {
  profile: CommunityProfileSummary;
  metrics: CommunityProfileMetrics;
  badges: CommunityBadgeProgress;
  ranks: CommunityRank[];
}

export interface CommunityBadgesResponse {
  badges: CommunityBadge[];
}

export interface CommunityLeaderboardParams {
  category?: string;
  limit?: number;
}

export interface CommunityLeaderboardCategory {
  id: string;
  title: string;
  description: string;
}

export interface CommunityLeaderboardHighlights {
  chaptersRead: number;
  totalPagesRead: number;
  longestStreak: number;
  reviewsCount: number;
  commentsCount: number;
  helpfulReceived: number;
  [key: string]: number;
}

export interface CommunityLeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  reputation: number;
  level: number;
  score: number;
  category: string;
  highlights: CommunityLeaderboardHighlights;
}

export interface CommunityLeaderboardResponse {
  category: string;
  availableCategories: CommunityLeaderboardCategory[];
  entries: CommunityLeaderboardEntry[];
}

export interface CommunityLeaderboardCategoriesResponse {
  categories: CommunityLeaderboardCategory[];
}

export interface CommunityOverviewResponse {
  totals: {
    users: number;
    ratings: number;
    reviews: number;
    comments: number;
    replies: number;
  };
  spotlight: CommunityLeaderboardEntry[];
}

export interface CommunityUserProfileResponse {
  userId: string;
  name: string;
  joinedAt: string;
  reputation: number;
  level: number;
  highlights: {
    chaptersRead: number;
    totalPagesRead: number;
    longestStreak: number;
    ratingsCount: number;
    commentsCount: number;
    helpfulReceived: number;
  };
  badges: CommunityBadge[];
}

// ===== Feed =====
export interface FeedPostUser {
  id: string;
  name: string | null;
  username: string | null;
  avatarKey: string | null;
}

export interface FeedPostSeries {
  id: string;
  title: string;
  coverS3Key: string | null;
}

export interface FeedPostMedia {
  id: string;
  title: string;
  number: number;
}

export interface FeedPostReaction {
  type: string;
}

export interface FeedPost {
  id: string;
  type: string;
  content: string;
  excerpt: string | null;
  pageNumber: number | null;
  hasSpoilers: boolean;
  moderationStatus: string;
  reactionsCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  user: FeedPostUser;
  series: FeedPostSeries | null;
  media: FeedPostMedia | null;
  reactions?: FeedPostReaction[];
}

export interface FeedListResponse {
  posts: FeedPost[];
  nextCursor: string | null;
}

export interface FeedQueryParams {
  cursor?: string;
  limit?: number;
  type?: string;
}

export interface CreateFeedPostRequest {
  type?: string;
  content: string;
  excerpt?: string;
  pageNumber?: number;
  seriesId?: string;
  mediaId?: string;
  hasSpoilers?: boolean;
}

export interface UpdateFeedPostRequest {
  content?: string;
  hasSpoilers?: boolean;
}

export interface FeedPostMutationResponse {
  post: FeedPost;
  moderated?: boolean;
  message: string;
}

export interface FeedReactionRequest {
  type: string;
}

export interface FeedReactionResponse {
  removed?: true;
  type?: string;
  message?: string;
}

export interface FeedModerationPost extends FeedPost {
  moderationScore: number;
  moderationReason: string | null;
  flaggedTerms: string | null;
  autoModerated: boolean;
}

export interface FeedModerationListResponse {
  posts: FeedModerationPost[];
  total: number;
}

export interface ModerateFeedPostRequest {
  status: string;
  reason?: string;
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
  seriesWithoutMetadataProfile?: number;
  seriesPendingMetadataReview?: number;
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
  workType?: string | null;
  metadata?: {
    reviewRequired: boolean;
    confidence: number;
    confidenceLabel: "low" | "medium" | "high";
    workType: string;
    canonicalGenres: string[];
    themes: string[];
    audience: string[];
    titleAliases: string[];
    metadataSources: MetadataSourceRecord[];
    lastEnrichedAt: string | null;
    lastReviewedAt: string | null;
  } | null;
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
  workType?: string;
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

export interface JobLifecycle {
  state:
    | "queued"
    | "scheduled"
    | "running"
    | "retrying"
    | "stalled"
    | "failed"
    | "completed";
  retrying: boolean;
  stalled: boolean;
  terminal: boolean;
  canRetry: boolean;
  canCancel: boolean;
}

export interface AdminJobUploadRuntime {
  itemId: string;
  sessionId: string;
  sessionStatus: UploadSessionStatus;
  userId: string;
  originalName: string;
  operational: UploadJob;
}

export interface AdminJob {
  id: string;
  name: string;
  queue?: "uploads" | "upload-intake" | "scans";
  data?: {
    uploadItemId?: string;
    userId?: string;
    tempPath?: string;
    safeName?: string;
    originalName?: string;
  };
  state: JobState;
  lifecycle?: JobLifecycle;
  dashboardState?: string;
  upload?: AdminJobUploadRuntime;
  progress?: number | Record<string, unknown>;
  priority?: number;
  result?: {
    seriesTitle?: string;
    chapter?: number;
    finalPath?: string;
    duplicate?: boolean;
    corruptedImages?: number;
    stats?: {
      originalSize?: number;
      optimizedSize?: number;
      filesProcessed?: number;
      filesConverted?: number;
      filesSkipped?: number;
      conversionTime?: number;
      compressionRatio?: number;
    };
    ingestion?: {
      decision?: IngestionDecision;
      reviewRequired?: boolean;
      confidenceScore?: number;
      confidenceLevel?: "high" | "medium" | "low";
      candidates?: IngestionCandidate[];
      evidence?: IngestionEvidenceItem[];
      stages?: IngestionStageItem[];
      warnings?: string[];
    };
  };
  error?: string;
  logs?: string[];
  attempts?: number;
  attemptsStarted?: number;
  maxAttempts?: number;
  stalledCount?: number;
  createdAt?: number;
  startedAt?: number;
  processedAt?: number;
  finishedAt?: number;
  failedAt?: number;
  duration?: number;
  stacktrace?: string[];
}

export interface JobQueueStats {
  queue?: "uploads" | "upload-intake" | "scans";
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
  paused?: boolean;
}

export interface UploadPipelineStats {
  sessions: {
    total: number;
    inFlight: number;
  };
  items: {
    active: number;
    cancelRequested: number;
    stuck: number;
  };
  thresholds: {
    heartbeatTimeoutMs: number;
    staleBefore: string;
  };
  generatedAt: string;
}

export interface JobsStats {
  uploads: JobQueueStats;
  uploadIntake: JobQueueStats;
  scans: Omit<JobQueueStats, "delayed"> & { delayed?: number };
  global: {
    totalActive: number;
    totalWaiting: number;
    totalFailed: number;
    totalCompleted: number;
  };
  uploadPipeline: UploadPipelineStats;
}

export interface JobsResponse {
  success: boolean;
  stats: JobQueueStats;
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
  size?: number;
  hash?: string;
  pendingApproval?: boolean;
}

export interface UploadBulkResponse {
  success: boolean;
  message: string;
  accepted: { filename: string; jobId: string; size?: number; hash?: string }[];
  rejected: { filename: string; reason: string }[];
  pendingApproval?: boolean;
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
  pendingApproval?: boolean;
}

export interface UploadSerieSingleResponse {
  success: boolean;
  message: string;
  seriesId: string;
  seriesTitle: string;
  jobId: string;
  filename: string;
  pendingApproval?: boolean;
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
  pendingApproval?: boolean;
}

export type UploadSerieResponse =
  | UploadSerieSingleResponse
  | UploadSerieMultiResponse;

export type UploadDecision = "EXISTING_SERIES" | "NEW_SERIES" | "SKIP";
export type IngestionDecision = "AUTO_APPROVE" | "MANUAL_REVIEW";

export interface IngestionEvidenceItem {
  source:
    | "forced_series_title"
    | "target_series"
    | "embedded_metadata"
    | "folder_name"
    | "file_name"
    | "parsed_title";
  rawValue: string;
  normalizedTitle?: string;
  accepted: boolean;
  weight: number;
  reason?: string;
}

export interface IngestionCandidate {
  normalizedTitle: string;
  evidenceScore: number;
  combinedScore: number;
  evidenceSources: string[];
  matchedSeriesId?: string;
  matchedSeriesTitle?: string;
  matchScore?: number;
  matchStrategy?: string;
}

export interface IngestionStageItem {
  stage: string;
  status: "completed" | "skipped" | "failed";
  detail?: string;
}

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
  confidenceScore?: number;
  decision?: IngestionDecision;
  reviewRequired?: boolean;
  matchedSeriesId?: string;
  matchedSeriesTitle?: string;
  candidates?: IngestionCandidate[];
  evidence?: IngestionEvidenceItem[];
  stages?: IngestionStageItem[];
  warnings?: string[];
}

export interface UploadDraftIngestionData {
  decision?: IngestionDecision;
  confidenceLevel?: "high" | "medium" | "low";
  confidenceScore?: number;
  reviewRequired?: boolean;
  candidates?: IngestionCandidate[];
  evidence?: IngestionEvidenceItem[];
  stages?: IngestionStageItem[];
  warnings?: string[];
}

export interface UploadDraftItem {
  id: string;
  source: "LOCAL" | "GOOGLE_DRIVE";
  originalName: string;
  extension?: string;
  sizeBytes?: number;
  parsed: UploadDraftParsedData;
  suggestion: UploadDraftSuggestionData;
  ingestion?: UploadDraftIngestionData;
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
  stage: "processing" | "analyzed";
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
    startedAt?: number;
    finishedAt?: number;
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
    rejected?: UploadDraftRejectedItem[];
    processing?: {
      state: "processing" | "completed" | "failed";
      totalReceived: number;
      analyzedCount: number;
      acceptedCount: number;
      rejectedCount: number;
      startedAt?: number;
      finishedAt?: number;
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

export interface UploadDraftBulkItemUpdate {
  itemId: string;
  selected?: boolean;
  chapterNumber?: number;
  volume?: number | null;
  year?: number | null;
  isOneShot?: boolean;
}

export interface UploadDraftBulkUpdateRequest {
  seriesTitle?: string;
  items?: UploadDraftBulkItemUpdate[];
}

export interface UploadDraftBulkUpdateResponse {
  success: boolean;
  selectedCount: number;
  totalCount: number;
  items: UploadDraftItem[];
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
    rejected?: UploadDraftRejectedItem[];
    processing?: {
      state: "processing" | "completed" | "failed";
      totalReceived: number;
      analyzedCount: number;
      acceptedCount: number;
      rejectedCount: number;
      startedAt?: number;
      finishedAt?: number;
      error?: string;
    };
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
export type ApprovalItem = UploadApprovalListItem;

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
  jobId?: string;
  approval: {
    id: string;
    originalName: string;
    sessionId?: string;
    submitterId?: string;
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
export type SubmissionItem = UploadApprovalListItem;

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
  id?: string;
  provider?: string;
  plan?: string;
  status?: SubscriptionStatus;
  state: SubscriptionState;
  accessGranted: boolean;
  paymentMethod?: string | null;
  isRecurring?: boolean | null;
  buyerEmail?: string;
  buyerName?: string | null;
  startsAt?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  cancellationRequestedAt?: string | null;
  cancellationEffectiveAt?: string | null;
  canceledAt?: string | null;
  cancelReason?: string | null;
  lastPaymentConfirmedAt?: string | null;
  setupCompletedAt?: string | null;
  renewalUrl?: string | null;
  reminder?: SubscriptionReminder;
  actions: SubscriptionActions;
  amount?: number | null;
  user?: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    subStatus?: string | null;
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
  setupPending: number;
  cancellationRequested: number;
  canceled: number;
  pastDue: number;
  refunded: number;
  expired: number;
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
  immediate?: boolean;
}

export interface CancelSubscriptionResponse {
  success: boolean;
  message: string;
  subscription: SubscriptionView;
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

// ===== Provider / Ingestion System =====
export type TitleImportStatus =
  | "TRACKED"
  | "IMPORTING"
  | "IMPORTED"
  | "PAUSED"
  | "FAILED";

export type ChapterImportStatus =
  | "PENDING"
  | "DOWNLOADING"
  | "DOWNLOADED"
  | "IMPORTED"
  | "FAILED"
  | "SKIPPED";

export interface CatalogTitle {
  provider: string;
  externalId: string;
  title: string;
  titleOriginal?: string | null;
  titlePortuguese?: string | null;
  description?: string | null;
  descriptionPtBr?: string | null;
  author?: string | null;
  artist?: string | null;
  coverUrl?: string | null;
  status?: string | null;
  tags?: string[];
  contentRating?: string | null;
  year?: number | null;
  lastChapter?: number | null;
  chaptersAvailable?: number | null;
  availableLanguages?: string[];
  initialized?: boolean;
  sourceUrl?: string | null;
}

export interface ProviderChapter {
  id: string;
  providerTitleId: string;
  externalId: string;
  chapter: number;
  volume?: number | null;
  title?: string | null;
  language: string;
  pages?: number | null;
  scanlationGroup?: string | null;
  importStatus: ChapterImportStatus;
  importError?: string | null;
  mediaId?: string | null;
  importedAt?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterStats {
  total: number;
  imported: number;
  pending: number;
  failed: number;
  downloading: number;
  skipped?: number;
}

export interface ProviderTitle {
  id: string;
  provider: string;
  externalId: string;
  seriesId?: string | null;
  title: string;
  titleOriginal?: string;
  titlePortuguese?: string;
  description?: string;
  descriptionPtBr?: string;
  author?: string;
  artist?: string;
  coverUrl?: string;
  status?: string;
  tags?: string[];
  contentRating?: string;
  year?: number;
  lastChapter?: number;
  importStatus: TitleImportStatus;
  language: string;
  chaptersImported: number;
  chaptersAvailable: number;
  syncEnabled: boolean;
  checkIntervalMs: number;
  lastCheckedAt?: string | null;
  lastNewChapterAt?: string | null;
  syncError?: string | null;
  createdAt: string;
  updatedAt: string;
  chapters?: ProviderChapter[];
  series?: {
    id: string;
    title: string;
    coverUrl?: string;
    coverPath?: string;
    coverS3Key?: string | null;
  } | null;
  chapterStats?: ChapterStats;
  hasCover?: boolean;
  _count?: { chapters: number };
}

export interface CatalogSearchParams {
  q?: string;
  language?: string;
  availableLanguage?: string;
  limit?: number;
  offset?: number;
  status?: string;
  contentRating?: string;
}

export interface CatalogSearchResponse {
  titles: CatalogTitle[];
  total: number;
  hasMore: boolean;
}

export interface CatalogTitleResponse {
  title: CatalogTitle;
}

export interface TrackTitleRequest {
  provider: string;
  externalId: string;
  language?: string;
  seriesId?: string;
}

export interface TrackTitleResponse {
  providerTitle: ProviderTitle;
  created: boolean;
}

export interface TrackedTitlesParams {
  provider?: string;
  importStatus?: TitleImportStatus;
  syncEnabled?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface TrackedTitlesResponse {
  titles: ProviderTitle[];
  total: number;
}

export interface TrackedTitleResponse {
  providerTitle: ProviderTitle;
}

export interface UpdateTrackedTitleRequest {
  syncEnabled?: boolean;
  checkIntervalMs?: number;
  importStatus?: "TRACKED" | "IMPORTING" | "IMPORTED" | "PAUSED";
  seriesId?: string | null;
}

export interface SyncChaptersResponse {
  providerTitleId: string;
  newChaptersFound: number;
  chaptersCreated: number;
  error?: string;
}

export interface ImportChapterResponse {
  queued: boolean;
  jobId?: string;
  providerChapterId?: string;
  error?: string;
}

export interface BulkImportRequest {
  chapterIds?: string[];
}

export interface BulkImportResponse {
  queued: number;
}

export type ProviderCapability =
  | "search"
  | "title_metadata"
  | "chapter_list"
  | "chapter_pages"
  | "update_check";

export interface ProviderInfo {
  name: string;
  displayName: string;
  capabilities: ProviderCapability[];
  defaultLanguage: string;
}

export interface ProvidersListResponse {
  providers: ProviderInfo[];
}

export interface ProviderStatsResponse {
  titles: {
    total: number;
    importing: number;
    imported: number;
    paused: number;
    failed: number;
  };
  chapters: {
    total: number;
    imported: number;
    pending: number;
    failed: number;
    downloading: number;
  };
  staleReset?: number;
}

export interface KeiyoushiSource {
  pkgName: string;
  name: string;
  lang: string;
  description?: string;
  version: string;
  baseUrl?: string;
  sourceId?: number;
  extensionPkg?: string;
  extensionVersion?: string;
  nsfw?: boolean;
}

export interface KeiyoushiStatsResponse {
  totalSources: number;
  totalExtensions: number;
  ptBrSources: number;
  languages: number;
  lastFetchedAt?: string;
}

export interface KeiyoushiSourcesResponse {
  sources: KeiyoushiSource[];
}

export interface KeiyoushiParams {
  lang?: string;
  search?: string;
}

// ===== Suwayomi Sidecar =====
export interface SuwayomiHealthResponse {
  configured: boolean;
  url?: string;
  reachable: boolean;
  sources: number;
  sourcesTotal?: number;
  defaultLang?: string;
}

export interface SuwayomiExtension {
  pkgName: string;
  name: string;
  lang: string;
  versionName: string;
  versionCode: number;
  isInstalled: boolean;
  hasUpdate: boolean;
  isNsfw: boolean;
  isObsolete?: boolean;
  repo?: string | null;
  iconUrl?: string;
}

export interface SuwayomiExtensionsParams {
  installed?: boolean;
}

export interface SuwayomiExtensionsResponse {
  extensions: SuwayomiExtension[];
}

export interface SuwayomiFetchResponse {
  success: boolean;
  message: string;
}

export interface SuwayomiInstallResponse {
  extension: SuwayomiExtension;
  sourcesRegistered?: number;
  pending: boolean;
  message?: string;
}

export interface SuwayomiUninstallResponse {
  extension: SuwayomiExtension;
  sourcesRegistered: number;
}

export interface RetryFailedResponse {
  reset: number;
}

export interface RetryChapterResponse {
  queued: boolean;
  jobId?: string;
  providerChapterId?: string;
  previousError?: string | null;
}

export interface ChapterStatusResponse {
  chapter: {
    id: string;
    chapter: number;
    importStatus: ChapterImportStatus;
    importError: string | null;
    mediaId: string | null;
    importedAt: string | null;
  };
  job: {
    id: string;
    state: string;
    progress: number;
    error: string | null;
    logs: string[];
    attempts: number;
    createdAt: number;
    finishedAt: number | null;
  } | null;
}

export interface CleanupStaleResponse {
  reset: number;
  staleDurationMinutes: number;
}

export interface UpdateChapterRequest {
  importStatus: ChapterImportStatus;
}

export interface UpdateChapterResponse {
  chapter: ProviderChapter;
}

export interface ReimportFromRequest {
  provider: string;
  externalChapterId: string;
}

export interface ReimportFromResponse {
  queued: boolean;
  jobId?: string;
  providerChapterId?: string;
  alternativeProvider: string;
  alternativeExternalChapterId: string;
  previousError?: string | null;
}

export interface SuwayomiReloadResponse {
  reloaded: boolean;
  sourcesRegistered: number;
  providers: ProviderInfo[];
}
