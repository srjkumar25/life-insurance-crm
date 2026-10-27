"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          router.push("/crm");
          router.refresh();
        } else {
          setMessage(
            "Account request submitted. Email confirmation complete karke sign in karein."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        router.push("/crm");
        router.refresh();
      }
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Request complete nahi hua."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{
      maxWidth: 420, margin: "70px auto", padding: 24,
      fontFamily: "Arial, sans-serif"
    }}>
      <h1>LifeCare CRM</h1>
      <p>{signup ? "Create your CRM account" : "Sign in to your CRM"}</p>

      <form onSubmit={submit}>
        <label style={{ display: "block", marginBottom: 14 }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 14 }}>
          Password (minimum 8 characters)
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ display: "block", width: "100%", padding: 10, marginTop: 6 }}
          />
        </label>

        <button
          disabled={busy}
          type="submit"
          style={{ padding: "10px 18px", cursor: "pointer" }}
        >
          {busy ? "Please wait..." : signup ? "Create account" : "Sign in"}
        </button>
      </form>

      <p>{message}</p>

      <button
        type="button"
        onClick={() => {
          setSignup(!signup);
          setMessage("");
        }}
        style={{
          border: 0, background: "transparent",
          color: "#315be8", cursor: "pointer", padding: 0
        }}
      >
        {signup
          ? "Already have an account? Sign in"
          : "New user? Create account"}
      </button>
    </main>
  );
}