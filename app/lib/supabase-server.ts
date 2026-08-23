import { createClient, type User } from "@supabase/supabase-js";

function createAdminClient(url: string, serviceKey: string) {
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

type AuthResult =
  | { user: User; admin: ReturnType<typeof createAdminClient> }
  | { response: Response };

export async function authenticateStudyBloom(request: Request): Promise<AuthResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) {
    return { response: Response.json({ error: "Cloud sync is not configured." }, { status: 503 }) };
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { response: Response.json({ error: "Sign in to sync across devices." }, { status: 401 }) };

  const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user?.email) {
    return { response: Response.json({ error: "Your session expired. Please sign in again." }, { status: 401 }) };
  }

  const ownerEmail = process.env.STUDYBLOOM_OWNER_EMAIL?.trim().toLowerCase();
  if (ownerEmail && data.user.email.toLowerCase() !== ownerEmail) {
    return { response: Response.json({ error: "This private StudyBloom belongs to a different account." }, { status: 403 }) };
  }

  const admin = createAdminClient(url, serviceKey);
  return { user: data.user, admin };
}
