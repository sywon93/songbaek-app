import { redirectIfAuthenticated } from "@/lib/auth/redirect-if-authenticated";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  await redirectIfAuthenticated();
  return <LoginForm />;
}
