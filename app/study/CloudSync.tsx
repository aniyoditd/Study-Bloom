"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "../lib/supabase-browser";
import type { StudyState } from "./types";

type SyncMode = "checking" | "setup" | "local" | "syncing" | "synced" | "offline" | "error";
type SyncInfo = { mode: SyncMode; email: string; displayName: string; updatedAt: string | null; message: string };
type SyncPayload = { state: StudyState | null; revision: number; updatedAt: string | null; user?: { email: string; displayName: string }; error?: string };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function mergeArray<T extends { id: string }>(base: T[], remote: T[], local: T[]) {
  const baseMap = new Map(base.map((item) => [item.id, item]));
  const remoteMap = new Map(remote.map((item) => [item.id, item]));
  const localMap = new Map(local.map((item) => [item.id, item]));
  const ids = new Set([...remoteMap.keys(), ...localMap.keys()]);
  const result: T[] = [];
  ids.forEach((id) => {
    const before = baseMap.get(id); const theirs = remoteMap.get(id); const mine = localMap.get(id);
    if (before && !mine) return;
    if (before && !theirs && mine && same(before, mine)) return;
    if (!mine && theirs) result.push(theirs);
    else if (mine && (!before || !same(before, mine))) result.push(mine);
    else if (theirs) result.push(theirs);
    else if (mine) result.push(mine);
  });
  return result;
}

function mergeRecord<T>(base: Record<string, T>, remote: Record<string, T>, local: Record<string, T>) {
  const result: Record<string, T> = {};
  const keys = new Set([...Object.keys(remote), ...Object.keys(local)]);
  keys.forEach((key) => {
    if (key in base && !(key in local)) return;
    if (key in base && !(key in remote) && same(base[key], local[key])) return;
    result[key] = key in local && !same(base[key], local[key]) ? local[key] : remote[key] ?? local[key];
  });
  return result;
}

function mergeState(base: StudyState, remote: StudyState, local: StudyState): StudyState {
  return {
    ...remote,
    profile: same(base.profile, local.profile) ? remote.profile : local.profile,
    settings: same(base.settings, local.settings) ? remote.settings : local.settings,
    classes: mergeArray(base.classes, remote.classes, local.classes),
    materials: mergeArray(base.materials, remote.materials, local.materials),
    tasks: mergeArray(base.tasks, remote.tasks, local.tasks),
    notes: mergeArray(base.notes, remote.notes, local.notes),
    events: mergeArray(base.events, remote.events, local.events),
    attempts: mergeArray(base.attempts, remote.attempts, local.attempts),
    activities: mergeArray(base.activities, remote.activities, local.activities),
    cardProgress: mergeRecord(base.cardProgress, remote.cardProgress, local.cardProgress),
  };
}

function deviceId() {
  const key = "studybloom-device-id";
  let id = localStorage.getItem(key);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(key, id); }
  return id;
}

export function useCloudSync(state: StudyState, setState: Dispatch<SetStateAction<StudyState>>, loaded: boolean) {
  const [info, setInfo] = useState<SyncInfo>({ mode: "checking", email: "", displayName: "", updatedAt: null, message: "Checking your private cloud…" });
  const revision = useRef(0); const base = useRef<StudyState | null>(null); const current = useRef(state); const ready = useRef(false); const timer = useRef<number | null>(null); const syncing = useRef(false); const token = useRef(""); const connectedUser = useRef("");
  current.current = state;

  const cloudFetch = useCallback((input: RequestInfo | URL, init: RequestInit = {}) => fetch(input, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token.current}` } }), []);

  const upload = useCallback(async (next: StudyState) => {
    if (!ready.current || !token.current || syncing.current) return;
    syncing.current = true; setInfo((value) => ({ ...value, mode: "syncing", message: "Saving changes to your private account…" }));
    try {
      let candidate = next;
      let response = await cloudFetch("/api/sync", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: candidate, baseRevision: revision.current, deviceId: deviceId() }) });
      if (response.status === 409) {
        const conflict = await response.json() as SyncPayload;
        candidate = mergeState(base.current || candidate, conflict.state || candidate, candidate);
        revision.current = conflict.revision;
        setState(candidate);
        response = await cloudFetch("/api/sync", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state: candidate, baseRevision: revision.current, deviceId: deviceId() }) });
      }
      if (response.status === 401) { ready.current = false; setInfo({ mode: "local", email: "", displayName: "", updatedAt: null, message: "Your session expired. Sign in again to sync." }); return; }
      if (!response.ok) { const problem = await response.json().catch(() => ({})) as SyncPayload; throw new Error(problem.error || "Cloud save failed"); }
      const saved = await response.json() as SyncPayload;
      revision.current = saved.revision; base.current = candidate;
      setInfo((value) => ({ ...value, mode: "synced", updatedAt: saved.updatedAt, message: "All changes are saved across your devices." }));
    } catch (error) {
      setInfo((value) => ({ ...value, mode: navigator.onLine ? "error" : "offline", message: navigator.onLine ? (error instanceof Error ? error.message : "Cloud sync will retry automatically.") : "Offline changes are queued on this device." }));
    } finally { syncing.current = false; }
  }, [cloudFetch, setState]);

  const connect = useCallback(async (session: Session) => {
    token.current = session.access_token;
    if (ready.current && connectedUser.current === session.user.id) return;
    connectedUser.current = session.user.id;
    setInfo((value) => ({ ...value, mode: "checking", email: session.user.email || "", displayName: String(session.user.user_metadata?.full_name || session.user.email || "Student"), message: "Loading your private StudyBloom workspace…" }));
    try {
      const response = await cloudFetch("/api/sync", { cache: "no-store" });
      if (!response.ok) { const problem = await response.json().catch(() => ({})) as SyncPayload; throw new Error(problem.error || "Cloud sync is unavailable."); }
      const cloud = await response.json() as SyncPayload;
      revision.current = cloud.revision;
      setInfo({ mode: "synced", email: cloud.user?.email || session.user.email || "", displayName: cloud.user?.displayName || session.user.email || "Student", updatedAt: cloud.updatedAt, message: cloud.state ? "Your cloud workspace is up to date." : "Connecting this device to your account…" });
      if (cloud.state) { base.current = cloud.state; setState(cloud.state); ready.current = true; }
      else { base.current = current.current; ready.current = true; await upload(current.current); }
    } catch (error) {
      ready.current = false;
      setInfo((value) => ({ ...value, mode: "error", message: error instanceof Error ? error.message : "Cloud sync is temporarily unavailable." }));
    }
  }, [cloudFetch, setState, upload]);

  useEffect(() => {
    if (!loaded) return;
    const client = getSupabaseBrowserClient();
    if (!client) { setInfo({ mode: "setup", email: "", displayName: "", updatedAt: null, message: "Cloud sync needs to be connected in Vercel. Local saving is active." }); return; }
    let active = true;
    client.auth.getSession().then(({ data }) => { if (!active) return; if (data.session) connect(data.session); else setInfo({ mode: "local", email: "", displayName: "", updatedAt: null, message: "Sign in with your private StudyBloom account to sync." }); });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session) connect(session);
      else { token.current = ""; connectedUser.current = ""; ready.current = false; setInfo({ mode: "local", email: "", displayName: "", updatedAt: null, message: "Signed out. This device is still saving locally." }); }
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [loaded, connect]);

  useEffect(() => {
    if (!loaded || !ready.current || same(base.current, state)) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => upload(state), 1200);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [state, loaded, upload]);

  useEffect(() => { const online = () => { if (!same(base.current, current.current)) upload(current.current); }; window.addEventListener("online", online); return () => window.removeEventListener("online", online); }, [upload]);

  const signIn = async (email: string, password: string) => {
    const client = getSupabaseBrowserClient(); if (!client) return "Cloud sync is not configured in Vercel yet.";
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    if (data.session) await connect(data.session);
    return "";
  };
  const signUp = async (email: string, password: string, displayName: string) => {
    const client = getSupabaseBrowserClient(); if (!client) return "Cloud sync is not configured in Vercel yet.";
    const { data, error } = await client.auth.signUp({ email, password, options: { data: { full_name: displayName } } });
    if (error) return error.message;
    if (data.session) { await connect(data.session); return ""; }
    return "Check your email to confirm your new StudyBloom account, then sign in.";
  };
  const signOut = async () => { const client = getSupabaseBrowserClient(); await client?.auth.signOut(); };
  return { info, syncNow: () => upload(current.current), signIn, signUp, signOut };
}

type IndicatorProps = ReturnType<typeof useCloudSync>;

export function CloudSyncIndicator({ info, syncNow, signIn, signUp, signOut }: IndicatorProps) {
  const [open, setOpen] = useState(false); const [creating, setCreating] = useState(false); const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState(""); const [formMessage, setFormMessage] = useState(""); const [busy, setBusy] = useState(false);
  const color = info.mode === "synced" ? "green" : info.mode === "syncing" || info.mode === "checking" ? "purple" : info.mode === "local" || info.mode === "setup" ? "gray" : "orange";
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setFormMessage(""); const message = creating ? await signUp(email, password, name) : await signIn(email, password); setFormMessage(message); setBusy(false); };
  return <><button className={`sb7-cloud-trigger ${color}`} title="Cloud sync and account" onClick={() => setOpen(true)}><i/> <span>{info.mode === "synced" ? "Saved" : info.mode === "syncing" ? "Saving" : info.mode === "setup" ? "Set up" : info.mode === "local" ? "Sign in" : info.mode === "offline" ? "Offline" : "Sync"}</span></button>{open && <div className="sb2-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}><section className="sb7-cloud-panel" role="dialog" aria-modal="true" aria-label="StudyBloom cloud account"><button className="sb2-modal-close" onClick={() => setOpen(false)}>×</button><header><span>☁</span><div><small>PRIVATE STUDYBLOOM CLOUD</small><h2>{info.email ? "Your account & sync" : info.mode === "setup" ? "Connect cloud sync" : creating ? "Create your account" : "Use StudyBloom everywhere"}</h2><p>{info.message}</p></div></header>{info.email ? <><div className="sb7-account"><span>☺</span><div><b>{info.displayName}</b><small>{info.email}</small></div><strong>Owner only</strong></div><div className="sb7-sync-details"><article><span>✓</span><div><b>Complete workspace sync</b><p>Classes, course details, notes, study kits, tasks, tests, flashcards, schedules, XP, and progress.</p></div></article><article><span>⌁</span><div><b>Offline queue</b><p>Keep working without internet. This device uploads queued changes when it reconnects.</p></div></article><article><span>↻</span><div><b>Revision protection</b><p>Changes from multiple devices are merged, with recent cloud snapshots kept for recovery.</p></div></article></div><footer><button onClick={syncNow}>Sync now</button><button className="sb7-link-button" onClick={signOut}>Sign out</button></footer>{info.updatedAt && <small className="sb7-last-sync">Last cloud save: {new Date(info.updatedAt).toLocaleString()}</small>}</> : info.mode === "setup" ? <><div className="sb7-device-list"><span>💻 Computer</span><span>▣ iPad</span><span>▯ Phone</span></div><p className="sb7-signin-copy">Your app is safely saving on this device. Follow the included <b>VERCEL-SETUP.md</b> guide once to turn on private cross-device sync.</p><small className="sb7-local-note">No OpenAI or ChatGPT account is required for cloud saving.</small></> : <><div className="sb7-device-list"><span>💻 Computer</span><span>▣ iPad</span><span>▯ Phone</span></div><form className="sb8-auth-form" onSubmit={submit}>{creating && <label>Your name<input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name"/></label>}<label>Private email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email"/></label><label>Password<input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={creating ? "new-password" : "current-password"}/></label>{formMessage && <p className="sb8-auth-message">{formMessage}</p>}<button className="sb2-primary sb7-signin" disabled={busy}>{busy ? "Please wait…" : creating ? "Create my private account" : "Sign in to sync"}</button></form><button className="sb8-auth-switch" onClick={() => { setCreating((value) => !value); setFormMessage(""); }}>{creating ? "Already created your account? Sign in" : "First time here? Create your account"}</button><small className="sb7-local-note">Your local workspace remains available even while signed out.</small></>}</section></div>}</>;
}
