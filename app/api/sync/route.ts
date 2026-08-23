import type { SupabaseClient } from "@supabase/supabase-js";
import { authenticateStudyBloom } from "../../lib/supabase-server";
import type { StudyState } from "../../study/types";

export const dynamic = "force-dynamic";

type AccountRow = { state_json: StudyState; revision: number; updated_at: string; updated_by_device: string | null };

function validState(value: unknown): value is StudyState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<StudyState>;
  return Array.isArray(state.classes) && Array.isArray(state.materials) && Array.isArray(state.tasks) && Array.isArray(state.notes) && Array.isArray(state.attempts) && Boolean(state.profile);
}

async function accountFor(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin.from("study_accounts").select("state_json, revision, updated_at, updated_by_device").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data as AccountRow | null;
}

export async function GET(request: Request) {
  const auth = await authenticateStudyBloom(request);
  if ("response" in auth) return auth.response;
  try {
    const account = await accountFor(auth.admin, auth.user.id);
    const email = auth.user.email || "";
    const displayName = String(auth.user.user_metadata?.full_name || auth.user.user_metadata?.name || email);
    return Response.json({
      user: { email, displayName },
      state: account?.state_json || null,
      revision: account?.revision || 0,
      updatedAt: account?.updated_at || null,
      updatedByDevice: account?.updated_by_device || null,
    });
  } catch {
    return Response.json({ error: "Cloud storage is not ready. Run supabase/schema.sql first." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const auth = await authenticateStudyBloom(request);
  if ("response" in auth) return auth.response;
  const raw = await request.text();
  if (raw.length > 8_000_000) return Response.json({ error: "Your StudyBloom workspace is too large to sync." }, { status: 413 });
  let body: { state?: unknown; baseRevision?: number; deviceId?: string };
  try { body = JSON.parse(raw); } catch { return Response.json({ error: "Invalid sync request." }, { status: 400 }); }
  if (!validState(body.state)) return Response.json({ error: "Invalid StudyBloom data." }, { status: 400 });

  try {
    const current = await accountFor(auth.admin, auth.user.id);
    const currentRevision = current?.revision || 0;
    if (current && body.baseRevision !== currentRevision) {
      return Response.json({ conflict: true, state: current.state_json, revision: currentRevision, updatedAt: current.updated_at }, { status: 409 });
    }

    const revision = currentRevision + 1;
    const updatedAt = new Date().toISOString();
    const deviceId = String(body.deviceId || "unknown").slice(0, 120);
    const account = {
      user_id: auth.user.id,
      email: auth.user.email || "",
      full_name: String(auth.user.user_metadata?.full_name || auth.user.user_metadata?.name || ""),
      state_json: body.state,
      revision,
      updated_at: updatedAt,
      updated_by_device: deviceId,
    };

    const saved = current
      ? await auth.admin.from("study_accounts").update(account as never).eq("user_id", auth.user.id).eq("revision", currentRevision).select("revision").maybeSingle()
      : await auth.admin.from("study_accounts").insert(account as never).select("revision").maybeSingle();
    if (saved.error || !saved.data) {
      const latest = await accountFor(auth.admin, auth.user.id);
      if (latest) return Response.json({ conflict: true, state: latest.state_json, revision: latest.revision, updatedAt: latest.updated_at }, { status: 409 });
      throw saved.error || new Error("Cloud save failed");
    }

    await auth.admin.from("study_snapshots").upsert({ user_id: auth.user.id, revision, state_json: body.state, created_at: updatedAt, device_id: deviceId } as never, { onConflict: "user_id,revision" });
    await auth.admin.from("study_snapshots").delete().eq("user_id", auth.user.id).lt("revision", Math.max(0, revision - 20));
    return Response.json({ ok: true, revision, updatedAt, user: { email: auth.user.email || "", displayName: account.full_name || auth.user.email || "Student" } });
  } catch {
    return Response.json({ error: "Cloud storage is unavailable. Check your Supabase setup." }, { status: 503 });
  }
}
