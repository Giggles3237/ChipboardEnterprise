"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./AuthStatus.module.css";

type Session = {
  displayName?: string;
  email?: string;
};

function userLabel(session: Session) {
  if (session.displayName && session.email) return `${session.displayName} (${session.email})`;
  return session.displayName || session.email || "Unknown user";
}

export default function AuthStatus() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/auth/session")
      .then((response) => response.json())
      .then((data) => setSession(data.session ?? null))
      .catch(() => setSession(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    window.location.href = "/login";
  }

  if (isLoading) {
    return <span className={styles.status}>Checking sign in...</span>;
  }

  if (!session) {
    return <Link className={styles.linkButton} href="/login">Sign in</Link>;
  }

  return (
    <div className={styles.authStatus} aria-label="Signed in user">
      <span>Signed in as {userLabel(session)}</span>
      <button type="button" onClick={signOut}>Sign out</button>
    </div>
  );
}
