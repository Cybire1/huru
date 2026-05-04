"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function SuccessBridge() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const origin = searchParams.get("origin");
  const error = searchParams.get("error");
  const [status, setStatus] = useState("Processing...");

  useEffect(() => {
    if (error) {
      setStatus("Authentication failed. You can close this window.");
      if (window.opener) {
        window.opener.postMessage(
          { type: "huru:auth:error", error },
          origin ?? "*",
        );
      }
      return;
    }

    if (!token || !origin) {
      setStatus("Missing token or origin. You can close this window.");
      return;
    }

    if (window.opener) {
      window.opener.postMessage(
        { type: "huru:auth:success", token },
        origin,
      );
      setStatus("Signed in! This window will close.");
      setTimeout(() => window.close(), 300);
    } else {
      setStatus("Unable to communicate with the parent window.");
    }
  }, [token, origin, error]);

  return <p style={{ fontSize: "0.875rem" }}>{status}</p>;
}

export default function ConsumerAuthSuccess() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#fafafa",
      }}
    >
      <Suspense
        fallback={
          <p style={{ fontSize: "0.875rem" }}>Processing...</p>
        }
      >
        <SuccessBridge />
      </Suspense>
    </div>
  );
}
