export const SUPABASE_PUBLIC_URL = "https://fxcoxnqqjgvqfukasfjb.supabase.co";

export const SUPABASE_PUBLIC_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6ImZ4Y294bnFxamd2cWZ1a2FzZmpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzODc5OTUsImV4cCI6MjA5Mzk2Mzk5NX0.PaG0jrPfZQPxmysHZAZ8ZA1WWrYabLywvzrLmOiACFI";

export function getSupabaseUrl() {
  return process.env.SUPABASE_URL || SUPABASE_PUBLIC_URL;
}

export function getSupabasePublishableKey() {
  return process.env.SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLIC_PUBLISHABLE_KEY;
}