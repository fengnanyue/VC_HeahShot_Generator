export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  username?: string | null;
  avatar_url: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_subscription_status: string | null;
  trial_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Generation {
  id: string;
  user_id: string;
  selfie_url: string;
  style_slug: string;
  status: "pending" | "processing" | "completed" | "failed";
  result_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
