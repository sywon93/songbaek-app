import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/isConfigured";
import { getSignedPhotoUrl } from "@/lib/supabase/storage";
import { StudentRecordDetailView } from "@/components/student/real/StudentRecordsView";

export default async function StudentRecordDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isSupabaseConfigured) redirect("/");

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");
  if (profile.role !== "student") redirect(`/${profile.role}`);

  // RLS(records_select_related)가 본인 기록만 허용하므로 student_id 조건도 함께 검증합니다.
  const { data: record } = await supabase
    .from("study_records")
    .select("*")
    .eq("id", id)
    .eq("student_id", user.id)
    .maybeSingle();
  if (!record) notFound();

  const [plannerPhotoUrl, studyPhotoUrl, reviewerRes] = await Promise.all([
    getSignedPhotoUrl(supabase, record.planner_photo_url),
    getSignedPhotoUrl(supabase, record.study_photo_url),
    // 피드백을 남긴 사람(대부분 담당 멘토)의 이름. 관리자가 수동 승인한 경우
    // profiles 조회가 RLS로 막혀 null 이 되며, 뷰에서 "관리자 선생님"으로 표시됩니다.
    record.reviewed_by
      ? supabase.from("profiles").select("name").eq("id", record.reviewed_by).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <StudentRecordDetailView
      profile={profile}
      record={record}
      plannerPhotoUrl={plannerPhotoUrl}
      studyPhotoUrl={studyPhotoUrl}
      reviewerName={reviewerRes.data?.name ?? null}
    />
  );
}
