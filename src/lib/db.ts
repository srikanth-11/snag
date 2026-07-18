import type { SupabaseClient } from "@supabase/supabase-js";
import type { Action, Finding, FindingCategory, Job, JobStatus } from "@/lib/types";
import { adminClient } from "@/lib/supabase/admin";
import { signShot } from "@/lib/storage";

export interface StepRecord {
  n: number;
  thought: string;
  action: Action;
  url: string;
  screenshotPath: string;
}

// ---- Writes (service role, bypass RLS) ----

export async function createJob(input: {
  userId: string | null;
  url: string;
  persona: string;
}): Promise<string> {
  const { data, error } = await adminClient()
    .from("jobs")
    .insert({ user_id: input.userId, url: input.url, status: "running", persona: input.persona })
    .select("id")
    .single();
  if (error || !data) throw new Error(`createJob failed: ${error?.message}`);
  return data.id as string;
}

export async function setJobStatus(
  id: string,
  status: JobStatus,
  extra?: { error?: string },
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === "done" || status === "error") patch.finished_at = new Date().toISOString();
  if (extra?.error) patch.error = extra.error;
  await adminClient().from("jobs").update(patch).eq("id", id);
}

export async function addStep(input: {
  jobId: string;
  n: number;
  action: Action;
  thought: string;
  screenshotPath: string;
  url: string;
}): Promise<void> {
  await adminClient().from("steps").insert({
    job_id: input.jobId,
    n: input.n,
    action: input.action,
    thought: input.thought,
    screenshot_path: input.screenshotPath || null,
    url: input.url,
  });
}

export async function addFinding(jobId: string, f: Finding): Promise<void> {
  const base = {
    job_id: jobId,
    kind: f.kind,
    severity: f.severity,
    title: f.title,
    detail: f.detail,
    evidence: f.evidence,
    repro: f.repro,
    screenshot_path: f.screenshotPath ?? null,
    verified: f.verified,
  };
  const full = {
    ...base,
    category: f.category,
    docs_url: f.docsUrl ?? null,
    selector: f.selector ?? null,
    suggestion: f.suggestion ?? null,
  };
  // Insert with the richer columns; fall back to the base shape if the migration
  // (0002) that adds category/docs_url/selector hasn't been run yet.
  const { error } = await adminClient().from("findings").insert(full);
  if (error) await adminClient().from("findings").insert(base);
}

// ---- Reads (caller's RLS-scoped client) ----

interface JobRow {
  id: string;
  url: string;
  status: JobStatus;
  persona: string | null;
  error: string | null;
  created_at: string;
  finished_at: string | null;
}

function mapJob(row: JobRow): Job {
  return {
    id: row.id,
    url: row.url,
    status: row.status,
    persona: row.persona ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.created_at,
    finishedAt: row.finished_at ?? undefined,
  };
}

export async function getJob(client: SupabaseClient, id: string): Promise<Job | null> {
  const { data } = await client.from("jobs").select("*").eq("id", id).maybeSingle();
  return data ? mapJob(data as JobRow) : null;
}

// Most recent completed hunt on the same URL before this one (for regression diff).
export async function findPreviousJobId(
  client: SupabaseClient,
  url: string,
  beforeIso: string,
): Promise<string | null> {
  const { data } = await client
    .from("jobs")
    .select("id")
    .eq("url", url)
    .eq("status", "done")
    .lt("created_at", beforeIso)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function listUserJobs(
  client: SupabaseClient,
  userId: string,
): Promise<(Job & { findingCount: number })[]> {
  const { data } = await client
    .from("jobs")
    .select("*, findings(count)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((row) => {
    const r = row as JobRow & { findings?: { count: number }[] };
    return { ...mapJob(r), findingCount: r.findings?.[0]?.count ?? 0 };
  });
}

interface FindingRow {
  kind: "hard" | "soft";
  category: FindingCategory | null;
  severity: Finding["severity"];
  title: string;
  detail: string | null;
  evidence: string[] | null;
  repro: string[] | null;
  selector: string | null;
  docs_url: string | null;
  suggestion: string | null;
  screenshot_path: string | null;
  verified: boolean;
}

export async function getFindings(client: SupabaseClient, jobId: string): Promise<Finding[]> {
  const { data } = await client
    .from("findings")
    .select("*")
    .eq("job_id", jobId)
    .order("id", { ascending: true });
  return Promise.all(
    (data ?? []).map(async (row) => {
      const r = row as FindingRow;
      return {
        kind: r.kind,
        category: r.category ?? (r.kind === "soft" ? "ux" : "error"),
        severity: r.severity,
        title: r.title,
        detail: r.detail ?? "",
        evidence: r.evidence ?? [],
        repro: r.repro ?? [],
        selector: r.selector ?? undefined,
        docsUrl: r.docs_url ?? undefined,
        suggestion: r.suggestion ?? undefined,
        screenshotPath: r.screenshot_path ? (await signShot(r.screenshot_path)) || undefined : undefined,
        verified: r.verified,
      };
    }),
  );
}

interface StepRow {
  n: number;
  thought: string | null;
  action: Action | null;
  url: string | null;
  screenshot_path: string | null;
}

export async function getSteps(client: SupabaseClient, jobId: string): Promise<StepRecord[]> {
  const { data } = await client
    .from("steps")
    .select("n, thought, action, url, screenshot_path")
    .eq("job_id", jobId)
    .order("n", { ascending: true });
  return (data ?? []).map((row) => {
    const r = row as StepRow;
    return {
      n: r.n,
      thought: r.thought ?? "",
      action: r.action ?? { kind: "stop", reason: "" },
      url: r.url ?? "",
      screenshotPath: r.screenshot_path ?? "",
    };
  });
}
