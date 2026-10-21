import { Suspense } from "react";
import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="login-shell">
          <section className="login-main" role="status">
            Loading sign in…
          </section>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
