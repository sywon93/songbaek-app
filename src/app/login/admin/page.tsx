import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";
import { AdminLoginForm } from "./AdminLoginForm";

export default async function AdminLoginPage() {
  await redirectIfAuthenticated();
  return <AdminLoginForm />;
}
