"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useState } from "react";

function SignInForm() {
  const searchParams = useSearchParams();
  const apiKey = searchParams.get("apiKey") ?? "";
  const origin = searchParams.get("origin") ?? "";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = useCallback(async () => {
    if (!apiKey) {
      setError("Missing API key.");
      return;
    }
    if (!origin) {
      setError("Missing origin.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Validate API key server-side before redirecting to OAuth
      const res = await fetch("/auth/consumer/callback?preflight=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Invalid API key.");
        setLoading(false);
        return;
      }

      // Build Supabase OAuth URL with state
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
      const state = btoa(JSON.stringify({ apiKey, origin }));
      const redirectTo = `${window.location.origin}/auth/consumer/callback`;

      const oauthUrl =
        `${supabaseUrl}/auth/v1/authorize?` +
        `provider=google&` +
        `redirect_to=${encodeURIComponent(redirectTo)}&` +
        `state=${encodeURIComponent(state)}`;

      window.location.href = oauthUrl;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }, [apiKey, origin]);

  return (
    <div
      style={{
        width: 380,
        padding: "2.5rem",
        background: "#141414",
        borderRadius: 12,
        border: "1px solid #262626",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            color: "#fafafa",
            margin: 0,
          }}
        >
          Sign in to continue
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "#888",
            marginTop: "0.5rem",
          }}
        >
          Powered by Huru
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: "0.75rem",
            background: "#1a0000",
            border: "1px solid #3b0000",
            borderRadius: 8,
            color: "#ef4444",
            fontSize: "0.8125rem",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSignIn}
        disabled={loading}
        style={{
          width: "100%",
          padding: "0.75rem 1rem",
          background: "#fff",
          color: "#000",
          border: "none",
          borderRadius: 8,
          fontSize: "0.875rem",
          fontWeight: 500,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 2.58 9 3.58z"
          />
        </svg>
        {loading ? "Redirecting..." : "Sign in with Google"}
      </button>
    </div>
  );
}

export default function ConsumerSignIn() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <Suspense
        fallback={
          <p style={{ color: "#888", fontSize: "0.875rem" }}>Loading...</p>
        }
      >
        <SignInForm />
      </Suspense>
    </div>
  );
}
