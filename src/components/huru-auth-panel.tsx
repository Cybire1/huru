"use client";

import { useMemo } from "react";
import { getBrowserSupabase } from "@/lib/huru/browser-supabase";
import { DashboardProvider, useDash } from "@/components/dashboard/dash-context";
import { DashDemo } from "@/components/dashboard/dash-demo";
import { DashLoading } from "@/components/dashboard/dash-loading";
import { DashSignIn } from "@/components/dashboard/dash-sign-in";
import { DashLayout } from "@/components/dashboard/dash-layout";

function DashboardRouter() {
  const { sessionReady, overview } = useDash();
  if (!sessionReady) return <DashLoading />;
  if (!overview) return <DashSignIn />;
  return <DashLayout />;
}

export function HuruAuthPanel() {
  const supabase = useMemo(() => {
    try { return getBrowserSupabase(); }
    catch { return null; }
  }, []);

  if (!supabase) return <DashDemo />;

  return (
    <DashboardProvider supabase={supabase}>
      <DashboardRouter />
    </DashboardProvider>
  );
}
