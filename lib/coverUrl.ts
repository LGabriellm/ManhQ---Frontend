export function getPublicCoverUrl(seriesId: string, coverUrl?: string | null): string {
  return coverUrl || `/public/series/${seriesId}/cover`;
}
