export const DISCOVERY_CATEGORIES = {
  all: '全部',
  literature: '文学',
  history: '历史',
  society: '社会',
  science: '科学',
  psychology: '心理',
} as const;
export type DiscoveryCategory = keyof typeof DISCOVERY_CATEGORIES;
export interface DiscoveryBook {
  id: string;
  title: string;
  author: string;
  category: Exclude<DiscoveryCategory, 'all'>;
  summary: string;
  titleAliases?: string[];
  authorAliases?: string[];
}
export type DiscoveryStatus = 'read' | 'dismissed' | 'selected';
export interface DiscoveryRecord {
  id: string;
  title: string;
  author: string;
  status: DiscoveryStatus;
  updatedAt: number;
}
export interface DiscoveryPreferences {
  version: 1;
  category: DiscoveryCategory;
  seen: string[];
  records: Record<string, DiscoveryRecord>;
}
export interface DiscoveryMetadata {
  source: 'Open Library';
  url: string;
  coverUrl?: string;
  rating?: number;
  ratingCount?: number;
}
