"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatStudentId, studentIdToEmail } from "@/lib/auth/student-id";

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
  const classNo = Number(formData.get("classNo"));
  const studentNo = Number(formData.get("studentNo"));
  const password = String(formData.get("password") ?? "");

  if (!name || !classNo || !studentNo || password.length < 6) {
    return { error: "이름/반/번호/비밀번호(6자 이상)를 모두 입력해주세요." };
  }

  const studentId = formatStudentId(classNo, studentNo);
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: studentIdToEmail(studentId),
    password,
    email_confirm: true,
    user_metadata: {
      role: "student",
      name,
      class_no: classNo,
      student_no: studentNo,
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
