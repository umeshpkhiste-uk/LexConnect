import { supabase } from "@/shared/lib/supabase";

export type TimelineEvent = {
  case_id: string;
  occurred_at: string;
  event_type: string;
  title: string;
  detail: string | null;
};

export async function getCaseTimeline(caseId: string): Promise<TimelineEvent[]> {
  const { data, error } = await supabase
    .from("case_timeline")
    .select("case_id, occurred_at, event_type, title, detail")
    .eq("case_id", caseId)
    .order("occurred_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as TimelineEvent[];
}
