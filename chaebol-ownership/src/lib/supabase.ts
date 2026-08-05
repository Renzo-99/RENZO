import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://irdcmmuhidoenhaujzkm.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyZGNtbXVoaWRvZW5oYXVqemttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNTEzNjMsImV4cCI6MjA4NzkyNzM2M30.rzXWOyIUpTf3wkJHhiHlij4UZ1XQJMz4GZL25loxmu4";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
