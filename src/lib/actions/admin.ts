"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidStudentId, studentIdToEmail } from "@/lib/auth/student-id";
import type { Weekday } from "@/lib/supabase/types";

export interface AdminActionState {
  error?: string;
  success?: string;
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("로그인이 필요해요.");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") throw new Error("관리자만 가능한 작업이에요.");
  return { supabase, adminId: user.id };
}

export async function createStudent(
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const name = String(formData.get("name") ?? "").trim();
  const studentId = String(formData.get("studentIdNumber") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !isValidStudentId(studentId) || password.length < 6) {
    return { error: "이름/학번(4~5자리 숫자)/비밀번호(6자 이상)를 모두 입력해주세요." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: studentIdToEmail(studentId),
    password,
    email_confirm: true,
    user_metadata: {
      role: "student",
      name,
      student_id_number: studentId,
    },
  });
  if (error) return { error: `학생 계정 생성 실패: ${error.message}` };

  revalidatePath("/admin");
  return { success: `${name} 학생 계정을 만들었어요. (학번 ${studentId})` };
}

export async function createMentor(
  _prev: AdminActionState | null,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || password.length < 6) {
    return { error: "이름/이메일/비밀번호(6자 이상)를 모두 입력해주세요." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "mentor", name },
  });
  if (error) return { error: `멘토 계정 생성 실패: ${error.message}` };

  revalidatePath("/admin");
  return { success: `${name} 멘토 계정을 만들었어요.` };
}

export async function deleteProfile(userId: string) {
  const { adminId } = await requireAdmin();
  if (userId === adminId) throw new Error("본인 계정은 삭제할 수 없어요.");
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function assignMentor(studentId: string, mentorId: string) {
  const { supabase, adminId } = await requireAdmin();
  const { error } = await supabase.from("mentor_student_links").upsert(
    { student_id: studentId, mentor_id: mentorId, created_by: adminId },
    { onConflict: "student_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function unassignMentor(studentId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("mentor_student_links")
    .delete()
    .eq("student_id", studentId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export interface UpdateStudentIdState {
  error?: string;
  success?: string;
}

export async function updateStudentIdNumber(
  studentId: string,
  _prev: UpdateStudentIdState | null,
  formData: FormData,
): Promise<UpdateStudentIdState> {
  let supabase;
  try {
    ({ supabase } = await requireAdmin());
  } catch (e) {
    return { error: (e as Error).message };
  }

  const newStudentId = String(formData.get("studentIdNumber") ?? "").trim();
  if (!isValidStudentId(newStudentId)) {
    return { error: "학번은 4~5자리 숫자로 입력해주세요." };
  }

  const admin = createAdminClient();
  const { error: authError } = await admin.auth.admin.updateUserById(studentId, {
    email: studentIdToEmail(newStudentId),
  });
  if (authError) {
    return { error: `학번 변경 실패: ${authError.message}` };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ student_id_number: newStudentId })
    .eq("id", studentId);
  if (profileError) {
    return { error: `로그인 정보는 변경됐지만 프로필 저장에 실패했어요: ${profileError.message}` };
  }

  revalidatePath("/admin");
  return { success: `학번을 ${newStudentId}(으)로 변경했어요.` };
}

export async function assignMentoringDay(studentId: string, day: Weekday | "") {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("profiles")
    .update({ mentoring_day: day || null })
    .eq("id", studentId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
