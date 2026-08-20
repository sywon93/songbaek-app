"use client";

import { AdminView } from "@/components/admin/AdminView";
import { MentorView } from "@/components/mentor/MentorView";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { StudentView } from "@/components/student/StudentView";
import { MockStoreProvider, useMockStore } from "@/lib/mock/store";

function AppBody() {
  const { role } = useMockStore();

  return (
    <main className="mx-auto max-w-2xl px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-4">
      {role === "student" && <StudentView />}
      {role === "mentor" && <MentorView />}
      {role === "admin" && <AdminView />}
    </main>
  );
}

export function AppShell() {
  return (
    <MockStoreProvider>
      <div className="min-h-screen">
        <RoleSwitcher />
        <AppBody />
      </div>
    </MockStoreProvider>
  );
}
