import type { SupabaseClient } from "@supabase/supabase-js";
import type { Action, Finding, Job, JobStatus } from "@/lib/types";
import { adminClient } from "@/lib/supabase/admin";

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
  await adminClient().from("findings").insert({
    job_id: jobId,
    kind: f.kind,
    severity: f.severity,
    title: f.title,
    detail: f.detail,
    evidence: f.evidence,
    repro: f.repro,
    screenshot_path: f.screenshotPath ?? null,
    verified: f.verified,
  });
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
  severity: Finding["severity"];
  title: string;
  detail: string | null;
  evidence: string[] | null;
  repro: string[] | null;
  screenshot_path: string | null;
  verified: boolean;
}

export async function getFindings(client: SupabaseClient, jobId: string): Promise<Finding[]> {
  const { data } = await client
    .from("findings")
    .select("*")
    .eq("job_id", jobId)
    .order("id", { ascending: true });
  return (data ?? []).map((row) => {
    const r = row as FindingRow;
    return {
      kind: r.kind,
      severity: r.severity,
      title: r.title,
      detail: r.detail ?? "",
      evidence: r.evidence ?? [],
      repro: r.repro ?? [],
      screenshotPath: r.screenshot_path ?? undefined,
      verified: r.verified,
    };
  });
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
