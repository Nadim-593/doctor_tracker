"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, LockKeyhole } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export default function LoginForm() {
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema) });
  const login = useMutation({
    mutationFn: (values) =>
      apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["auth", "me"] });
      const next = params.get("next");
      router.replace(
        next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard",
      );
    },
    onError: (error) =>
      setNotice(
        error.status === 401 ? "Invalid email or password." : error.message,
      ),
  });
  return (
    <main className="login-shell">
      <aside className="login-aside">
        <div className="brand" style={{ padding: 0, color: "white" }}>
          <span className="brand-mark">
            <Activity size={20} />
          </span>
          CareTrack
        </div>
        <div>
          <h1>Better care starts with a clear picture.</h1>
          <p>
            A focused workspace for managing your doctors, patients, and care
            operations.
          </p>
        </div>
        <span style={{ fontSize: 12, color: "#a9c0c9" }}>
          Healthcare administration, made clear.
        </span>
      </aside>
      <section className="login-main">
        <div className="login-card">
          <span className="brand-mark" style={{ marginBottom: 20 }}>
            <LockKeyhole size={19} />
          </span>
          <h2>Welcome back</h2>
          <p className="muted">Sign in to access your care workspace.</p>
          {notice && (
            <div className="alert" role="alert">
              {notice}
            </div>
          )}
          <form
            onSubmit={handleSubmit((values) => {
              setNotice("");
              login.mutate(values);
            })}
            noValidate
          >
            <div className="form-field">
              <label htmlFor="email">Email address</label>
              <input
                className="field"
                id="email"
                type="email"
                autoComplete="username"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
              {errors.email && (
                <p className="form-error" id="email-error">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="form-field">
              <label htmlFor="password">Password</label>
              <input
                className="field"
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
                {...register("password")}
              />
              {errors.password && (
                <p className="form-error" id="password-error">
                  {errors.password.message}
                </p>
              )}
            </div>
            <button
              className="button button-primary"
              style={{ width: "100%", marginTop: 21 }}
              type="submit"
              disabled={login.isPending}
            >
              {login.isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <div className="login-footer">
            Use the administrator account configured in the backend environment.
          </div>
        </div>
      </section>
    </main>
  );
}
