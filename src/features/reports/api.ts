import { supabase } from "@/shared/lib/supabase";

export type ReportTargetType = "advocate" | "post" | "comment" | "message" | "conversation";

export async function submitReport(input: { targetType: ReportTargetType; targetId: string; reason: string }): Promise<void> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error(userError?.message ?? "Not signed in");

  const { error } = await supabase.from("reports").insert({
    reporter_id: userData.user.id,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason.trim(),
  });
  if (error) throw new Error(error.message);
}
