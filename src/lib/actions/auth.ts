"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidStudentUsername, isValidUsername, usernameToEmail } from "@/lib/auth/username";

export interface AuthActionState {
  error?: string;
}

export async function signInStudent(
  _prevState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!isValidStudentUsername(username)) {
    return { error: "학번은 4~5자리 숫자예요. (예: 10101)" };
  }
  if (!password) {
    return { error: "비밀번호를 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error) {
    return { error: "학번 또는 비밀번호가 올바르지 않아요." };
  }

  redirect("/");
}

export async function signInMentor(
  _prevState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!isValidUsername(username)) {
    return { error: "아이디는 영문 소문자/숫자/밑줄 3~20자로 입력해주세요." };
  }
  if (!password) {
    return { error: "비밀번호를 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error) {
    return { error: "아이디 또는 비밀번호가 올바르지 않아요." };
  }

  redirect("/");
}

export async function signInAdmin(
  _prevState: AuthActionState | null,
  formData: FormData,
): Promise<AuthActionState> {
  const identifier = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "아이디(또는 이메일)와 비밀번호를 입력해주세요." };
  }

  // 관리자는 아이디(예: admin2)만 입력해도 로그인할 수 있고, 예전처럼 실제
  // 이메일을 그대로 입력해도 동작하도록 둘 다 지원합니다.
  const email = identifier.includes("@") ? identifier : usernameToEmail(identifier.toLowerCase());

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "아이디(또는 이메일) 또는 비밀번호가 올바르지 않아요." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profile?.role !== "admin") {
    await supabase.auth.signOut();
    return { error: "관리자 권한이 없는 계정이에요." };
  }

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
