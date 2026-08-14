"use client";

import { FormEvent, useState } from "react";
import styles from "./login.module.css";

export default function LoginClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Sign in with an active Chipboard user.");
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("Signing in...");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Unable to sign in.");
      }

      localStorage.setItem("chipboard.organizationId", data.user.organizationId);
      localStorage.setItem("chipboard.actorUserId", data.user.id);
      setMessage("Signed in. Opening Sales...");
      window.location.href = "/sales";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <p className={styles.eyebrow}>Chipboard Enterprise</p>
        <h1>Sign in</h1>
        <p>{message}</p>
        <form className={styles.form} onSubmit={submit}>
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <button type="submit" disabled={isLoading}>Sign in</button>
        </form>
        <a href="/admin">Set up users</a>
      </section>
    </main>
  );
}
