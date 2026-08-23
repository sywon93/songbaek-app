"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidStudentUsername, isValidUsername, usernameToEmail } from "@/lib/auth/username";
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

  if (!name || !isValidStudentUsername(studentId) || password.length < 6) {
    return { error: "이름/학번(4~5자리 숫자)/비밀번호(6자 이상)를 모두 입력해주세요." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: usernameToEmail(studentId),
    password,
    email_confirm: true,
    user_metadata: {
      role: "student",
      name,
      username: studentId,
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
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !isValidUsername(username) || password.length < 6) {
    return { error: "이름/아이디(영문 소문자·숫자·밑줄 3~20자)/비밀번호(6자 이상)를 모두 입력해주세요." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    user_metadata: { role: "mentor", name, username },
  });
  if (error) return { error: `멘토 계정 생성 실패: ${error.message}` };

  revalidatePath("/admin");
  return { success: `${name} 멘토 계정을 만들었어요. (아이디 ${username})` };
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

export interface UpdateUsernameState {
  error?: string;
  success?: string;
}

export async function updateUsername(
  profileId: string,
  _prev: UpdateUsernameState | null,
  formData: FormData,
): Promise<UpdateUsernameState> {
  let supabase;
  try {
    ({ supabase } = await requireAdmin());
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", profileId)
    .single();

  const newUsername = String(formData.get("username") ?? "").trim().toLowerCase();
  const valid =
    target?.role === "student" ? isValidStudentUsername(newUsername) : isValidUsername(newUsername);
  if (!valid) {
    return {
      error:
        target?.role === "student"
          ? "학번은 4~5자리 숫자로 입력해주세요."
          : "아이디는 영문 소문자/숫자/밑줄 3~20자로 입력해주세요.",
    };
  }

  const admin = createAdminClient();
  const { error: authError } = await admin.auth.admin.updateUserById(profileId, {
    email: usernameToEmail(newUsername),
  });
  if (authError) {
    return { error: `아이디 변경 실패: ${authError.message}` };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ username: newUsername })
    .eq("id", profileId);
  if (profileError) {
    return { error: `로그인 정보는 변경됐지만 프로필 저장에 실패했어요: ${profileError.message}` };
  }

  revalidatePath("/admin");
  return { success: `아이디를 ${newUsername}(으)로 변경했어요.` };
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

export async function adminSetStamp(payload: {
  studentId: string;
  date: string;
  approve: boolean;
  message?: string;
}) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_set_stamp", {
    p_student: payload.studentId,
    p_date: payload.date,
    p_approved: payload.approve,
    p_message: payload.message ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/records");
  revalidatePath("/mentor");
  revalidatePath("/student");
}
