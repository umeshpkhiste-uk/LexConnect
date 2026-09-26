import { supabase } from "@/shared/lib/supabase";

export type AgendaItemType = "hearing" | "meeting" | "task";

export type AgendaItem = {
  id: string;
  type: AgendaItemType;
  title: string;
  subtitle: string | null;
  at: string;
  status: string;
  caseId: string | null;
};

export async function listAgendaItems(params: { from: Date; to: Date }): Promise<AgendaItem[]> {
  const fromIso = params.from.toISOString();
  const toIso = params.to.toISOString();

  const [hearings, meetings, tasks] = await Promise.all([
    supabase
      .from("hearings")
      .select("id, case_id, hearing_at, hearing_type, status, cases(title)")
      .gte("hearing_at", fromIso)
      .lte("hearing_at", toIso),
    supabase
      .from("meetings")
      .select("id, case_id, meeting_at, meeting_type, cases(title), clients(full_name)")
      .gte("meeting_at", fromIso)
      .lte("meeting_at", toIso),
    supabase
      .from("tasks")
      .select("id, case_id, title, due_at, status, priority")
      .not("due_at", "is", null)
      .neq("status", "completed")
      .gte("due_at", fromIso)
      .lte("due_at", toIso),
  ]);

  if (hearings.error) throw new Error(hearings.error.message);
  if (meetings.error) throw new Error(meetings.error.message);
  if (tasks.error) throw new Error(tasks.error.message);

  const items: AgendaItem[] = [
    ...(hearings.data as any[]).map((h) => ({
      id: h.id,
      type: "hearing" as const,
      title: h.hearing_type ?? "Hearing",
      subtitle: h.cases?.title ?? null,
      at: h.hearing_at,
      status: h.status,
      caseId: h.case_id,
    })),
    ...(meetings.data as any[]).map((m) => ({
      id: m.id,
      type: "meeting" as const,
      title: (m.meeting_type as string)?.replace(/_/g, " ") ?? "Meeting",
      subtitle: m.cases?.title ?? m.clients?.full_name ?? null,
      at: m.meeting_at,
      status: "scheduled",
      caseId: m.case_id,
    })),
    ...(tasks.data as any[]).map((t) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      subtitle: null,
      at: t.due_at,
      status: t.status,
      caseId: t.case_id,
    })),
  ];

  return items.sort((a, b) => a.at.localeCompare(b.at));
}
