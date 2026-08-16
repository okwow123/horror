// Database 타입 — Supabase v2.112+ 호환.
// v2.112 부터 GenericTable 이 `Relationships: GenericRelationship[]` 를 요구.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne?: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          bio: string | null;
          avatar_url: string | null;
          is_bot: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          is_bot?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          is_bot?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          user_id: string | null;
          title: string | null;
          content: string;
          image_url: string | null;
          source_url: string | null;
          is_auto: boolean;
          is_anonymous: boolean;
          likes_count: number;
          comments_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title?: string | null;
          content: string;
          image_url?: string | null;
          source_url?: string | null;
          is_auto?: boolean;
          is_anonymous?: boolean;
          likes_count?: number;
          comments_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string | null;
          content?: string;
          image_url?: string | null;
          source_url?: string | null;
          is_auto?: boolean;
          is_anonymous?: boolean;
          likes_count?: number;
          comments_count?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'posts_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      card_answers: {
        Row: {
          id: string;
          user_id: string | null;  // [2026-08-16] 로그인 제거로 nullable
          answers: Json;
          post_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;  // [2026-08-16] 로그인 제거로 옵셔널
          answers: Json;
          post_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          answers?: Json;
          post_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: 'card_answers_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'card_answers_post_id_fkey'; columns: ['post_id']; referencedRelation: 'posts'; referencedColumns: ['id'] },
        ];
      };
      follows: {
        Row: {
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: 'follows_follower_id_fkey'; columns: ['follower_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'follows_following_id_fkey'; columns: ['following_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
        ];
      };
      likes: {
        Row: {
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          post_id?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: 'likes_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'likes_post_id_fkey'; columns: ['post_id']; referencedRelation: 'posts'; referencedColumns: ['id'] },
        ];
      };
      comments: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          content?: string;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: 'comments_user_id_fkey'; columns: ['user_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'comments_post_id_fkey'; columns: ['post_id']; referencedRelation: 'posts'; referencedColumns: ['id'] },
        ];
      };
      crawl_sources: {
        Row: {
          id: string;
          name: string;
          url: string;
          type: string;
          active: boolean;
          last_crawled_at: string | null;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          url: string;
          type: string;
          active?: boolean;
          last_crawled_at?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          url?: string;
          type?: string;
          active?: boolean;
          last_crawled_at?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      horror_contents: {
        Row: {
          id: string;
          subject: string | null;
          content: string;
          source_url: string | null;
          language: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject?: string | null;
          content: string;
          source_url?: string | null;
          language?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          subject?: string | null;
          content?: string;
          source_url?: string | null;
          language?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      crawl_items: {
        Row: {
          id: string;
          source_id: string;
          raw_title: string | null;
          raw_content: string;
          raw_url: string | null;
          language: string;
          processed: boolean;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          source_id: string;
          raw_title?: string | null;
          raw_content: string;
          raw_url?: string | null;
          language?: string;
          processed?: boolean;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          source_id?: string;
          raw_title?: string | null;
          raw_content?: string;
          raw_url?: string | null;
          language?: string;
          processed?: boolean;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          { foreignKeyName: 'crawl_items_source_id_fkey'; columns: ['source_id']; referencedRelation: 'crawl_sources'; referencedColumns: ['id'] },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
