import { adminClient } from "@/lib/supabase/admin";

export const FREE_DAILY_LIMIT = 10;

// How many hunts this user has left today (UTC day).
export async function remainingQuota(
  userId: string,
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await adminClient()
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since.toISOString());
  const used = count ?? 0;
  return { allowed: used < FREE_DAILY_LIMIT, used, limit: FREE_DAILY_LIMIT };
}
