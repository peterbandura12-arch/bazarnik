export type SourceType = "own" | "external";

export type ListingCondition = "nove" | "ako_nove" | "pouzite" | "na_diely";

export type ListingStatus = "active" | "sold" | "archived";

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface UnifiedListing {
  id: string;
  source_type: SourceType;
  slug: string;
  title: string;
  description: string | null;
  price: number | null;
  currency: string;
  condition: ListingCondition | null;
  brand: string | null;
  model: string | null;
  location: string | null;
  category_id: string | null;
  category_slug?: string | null;
  image_url: string | null;
  focal_x?: number | null;
  focal_y?: number | null;
  published_at: string;
  status: ListingStatus;
  source_id: string | null;
  source_name: string | null;
  source_url: string | null;
  demo?: boolean;
}

export interface Profile {
  id: string;
  email: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  location: string | null;
  role: "user" | "admin";
  is_blocked: boolean;
  created_at: string;
}

export interface ListingImage {
  id: string;
  listing_id: string;
  url: string;
  sort_order: number;
  is_primary: boolean;
}

export interface ConversationRow {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  last_message_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  image_url: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: "message" | "saved_search" | "listing_status" | "account";
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface SavedSearchRow {
  id: string;
  user_id: string;
  name: string;
  query: Record<string, string>;
  notify: boolean;
  created_at: string;
}

export interface ReportRow {
  id: string;
  reporter_id: string | null;
  listing_id: string | null;
  external_listing_id: string | null;
  reason: string;
  details: string | null;
  status: "new" | "reviewed" | "resolved";
  created_at: string;
}

export interface ExternalSourceRow {
  id: string;
  slug: string;
  name: string;
  website_url: string;
  adapter: string;
  feed_url: string | null;
  is_active: boolean;
  last_synced_at: string | null;
  notes: string | null;
}
