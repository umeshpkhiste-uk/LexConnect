import { supabase } from "@/shared/lib/supabase";

async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error(error?.message ?? "Not signed in");
  return data.user.id;
}

export async function isBlocked(targetId: string): Promise<boolean> {
  const me = await currentUserId();
  const { data, error } = await supabase
    .from("blocks")
    .select("blocker_id")
    .eq("blocker_id", me)
    .eq("blocked_id", targetId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}

export async function blockAdvocate(targetId: string): Promise<void> {
  const me = await currentUserId();
  const { error } = await supabase.from("blocks").insert({ blocker_id: me, blocked_id: targetId });
  if (error) throw new Error(error.message);
}

export async function unblockAdvocate(targetId: string): Promise<void> {
  const me = await currentUserId();
  const { error } = await supabase.from("blocks").delete().eq("blocker_id", me).eq("blocked_id", targetId);
  if (error) throw new Error(error.message);
}
