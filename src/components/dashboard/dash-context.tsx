"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DashboardAnalytics, DashboardOverview, DashboardProjectDetail, DashboardSection } from "./dash-types";
import { getRedirectUrl } from "./dash-helpers";

/* ── Context shape ── */

type DashContextValue = {
  supabase: SupabaseClient;
  sessionReady: boolean;
  overview: DashboardOverview | null;
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string | null) => void;
  projectDetail: DashboardProjectDetail | null;
  detailStatus: string;
  detailLoading: boolean;
  activeSection: DashboardSection;
  setActiveSection: (s: DashboardSection) => void;
  showProjectModal: boolean;
  setShowProjectModal: (v: boolean) => void;
  newProjectName: string;
  setNewProjectName: (v: string) => void;
  visibleApiKey: string | null;
  setVisibleApiKey: (v: string | null) => void;
  status: string;
  setStatus: (v: string) => void;
  isPending: boolean;
  contentRef: React.RefObject<HTMLDivElement | null>;
  panelRef: React.RefObject<HTMLElement | null>;

  /* Analytics (loaded on-demand by usage section) */
  analytics: DashboardAnalytics | null;
  analyticsLoading: boolean;
  analyticsPage: number;
  setAnalyticsPage: (v: number | ((p: number) => number)) => void;
  analyticsEndpointFilter: string;
  setAnalyticsEndpointFilter: (v: string) => void;
  analyticsStatusFilter: string;
  setAnalyticsStatusFilter: (v: string) => void;

  /* Actions */
  refresh: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onMagicLink: (email: string) => Promise<void>;
  onGoogle: () => Promise<void>;
  createProject: (name: string) => Promise<void>;
  rotateKey: () => Promise<void>;
  topUp: (packId: string) => Promise<void>;
  flashCopy: (text: string, setter: (v: string | null) => void) => void;
};

const DashContext = createContext<DashContextValue | null>(null);

export function useDash() {
  const ctx = useContext(DashContext);
  if (!ctx) throw new Error("useDash must be used inside <DashboardProvider>");
  return ctx;
}

/* ── Provider ── */

export function DashboardProvider({ supabase, children }: { supabase: SupabaseClient; children: React.ReactNode }) {
  const panelRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [status, setStatus] = useState("");
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectDetail, setProjectDetail] = useState<DashboardProjectDetail | null>(null);
  const [detailStatus, setDetailStatus] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [visibleApiKey, setVisibleApiKey] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  /* Analytics state */
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsPage, setAnalyticsPage] = useState(1);
  const [analyticsEndpointFilter, setAnalyticsEndpointFilter] = useState("");
  const [analyticsStatusFilter, setAnalyticsStatusFilter] = useState("");

  const flashCopy = useCallback((text: string, setter: (v: string | null) => void) => {
    void navigator.clipboard.writeText(text);
    setter("Copied!");
    setTimeout(() => setter(null), 2000);
  }, []);

  /* ── Data: session + overview ── */
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (data.session?.access_token) {
        const res = await fetch("/api/dashboard/me", { headers: { Authorization: `Bearer ${data.session.access_token}` } });
        if (res.ok) {
          const p = (await res.json()) as DashboardOverview;
          setOverview(p);
          setSelectedProjectId((c) => c && p.projects.some((x) => x.id === c) ? c : p.projects[0]?.id ?? null);
        }
      }
      setSessionReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.access_token) {
        setOverview(null); setSelectedProjectId(null); setProjectDetail(null);
        setDetailStatus(""); setVisibleApiKey(null);
        setSessionReady(true); return;
      }
      const res = await fetch("/api/dashboard/me", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.ok) {
        const p = (await res.json()) as DashboardOverview;
        setOverview(p);
        setSelectedProjectId((c) => c && p.projects.some((x) => x.id === c) ? c : p.projects[0]?.id ?? null);
      } else { setOverview(null); setVisibleApiKey(null); }
      setSessionReady(true);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [supabase]);

  /* ── Data: project detail ── */
  useEffect(() => {
    if (!overview || !selectedProjectId) return;
    let mounted = true;
    const load = async () => {
      setDetailLoading(true); setDetailStatus("");
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || !mounted) { setDetailLoading(false); return; }
      const res = await fetch(`/api/dashboard/projects/${selectedProjectId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!mounted) return;
      if (!res.ok) { setProjectDetail(null); setDetailStatus("Could not load project."); setDetailLoading(false); return; }
      setProjectDetail((await res.json()) as DashboardProjectDetail);
      setDetailStatus(""); setDetailLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, [supabase, overview, selectedProjectId]);

  /* ── Data: analytics ── */
  useEffect(() => {
    if (!overview || !selectedProjectId || activeSection !== "usage") return;
    let mounted = true;
    const load = async () => {
      setAnalyticsLoading(true);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token || !mounted) { setAnalyticsLoading(false); return; }
      const params = new URLSearchParams({ page: String(analyticsPage), pageSize: "20" });
      if (analyticsEndpointFilter) params.set("endpoint", analyticsEndpointFilter);
      if (analyticsStatusFilter) params.set("status", analyticsStatusFilter);
      const res = await fetch(`/api/dashboard/projects/${selectedProjectId}/analytics?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!mounted) return;
      if (res.ok) setAnalytics((await res.json()) as DashboardAnalytics);
      setAnalyticsLoading(false);
    };
    void load();
    return () => { mounted = false; };
  }, [supabase, overview, selectedProjectId, activeSection, analyticsPage, analyticsEndpointFilter, analyticsStatusFilter]);

  /* ── Actions ── */
  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/dashboard/me", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const p = (await res.json()) as DashboardOverview;
      setOverview(p);
      setSelectedProjectId((c) => c && p.projects.some((x) => x.id === c) ? c : p.projects[0]?.id ?? null);
    }
  }, [supabase]);

  const onSignOut = useCallback(async () => {
    setStatus(""); setDetailStatus(""); setSelectedProjectId(null);
    setProjectDetail(null); setVisibleApiKey(null);
    await supabase.auth.signOut(); setOverview(null);
  }, [supabase]);

  const onMagicLink = useCallback(async (email: string) => {
    setStatus("");
    const addr = email.trim();
    if (!addr) { setStatus("Enter an email address."); return; }
    const { error } = await supabase.auth.signInWithOtp({ email: addr, options: { emailRedirectTo: getRedirectUrl() } });
    setStatus(error ? error.message : "Magic link sent — check your email.");
  }, [supabase]);

  const onGoogle = useCallback(async () => {
    setStatus("");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: getRedirectUrl() } });
    if (error) setStatus(error.message);
  }, [supabase]);

  const createProject = useCallback(async (name: string) => {
    if (!name.trim()) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setStatus("Sign in first."); return; }
    startTransition(async () => {
      const res = await fetch("/api/dashboard/projects", {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const p = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
        setStatus(p?.error?.message || "Could not create project."); return;
      }
      const created = (await res.json()) as { id: string; api_key: string };
      setSelectedProjectId(created.id); setVisibleApiKey(created.api_key);
      await refresh(); setStatus("Project created.");
      setShowProjectModal(false); setNewProjectName("");
    });
  }, [supabase, refresh]);

  const rotateKey = useCallback(async () => {
    if (!selectedProjectId) return;
    setDetailStatus("Rotating key...");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setDetailStatus("Sign in first."); return; }
    const res = await fetch(`/api/dashboard/projects/${selectedProjectId}/rotate-key`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      const p = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setDetailStatus(p?.error?.message || "Could not rotate key."); return;
    }
    const rotated = (await res.json()) as { apiKey: string; apiKeyPrefix: string; keyId: string; project: DashboardOverview["projects"][number] };
    setDetailStatus(`New prefix: ${rotated.apiKeyPrefix}...`);
    setVisibleApiKey(rotated.apiKey);
    setProjectDetail((c) => c ? { ...c, project: { ...c.project, apiKey: rotated.project.apiKey, apiKeyPrefix: rotated.project.apiKeyPrefix, creditsBalance: rotated.project.creditsBalance }, key: { id: rotated.keyId, prefix: rotated.project.apiKeyPrefix } } : c);
    await refresh(); setStatus("");
  }, [supabase, selectedProjectId, refresh]);

  const topUp = useCallback(async (packId: string) => {
    if (!selectedProjectId) return;
    setDetailStatus("Creating checkout...");
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setDetailStatus("Sign in first."); return; }
    const res = await fetch(`/api/dashboard/projects/${selectedProjectId}/top-up`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ packId, successUrl: `${window.location.origin}/dashboard?topup=success`, cancelUrl: `${window.location.origin}/dashboard?topup=cancel` }),
    });
    if (!res.ok) {
      const p = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      setDetailStatus(p?.error?.message || "Could not start top-up."); return;
    }
    const checkout = (await res.json()) as { authorization_url: string };
    window.location.assign(checkout.authorization_url);
  }, [supabase, selectedProjectId]);

  const value = useMemo<DashContextValue>(() => ({
    supabase, sessionReady, overview,
    selectedProjectId, setSelectedProjectId,
    projectDetail, detailStatus, detailLoading,
    activeSection, setActiveSection,
    showProjectModal, setShowProjectModal, newProjectName, setNewProjectName,
    visibleApiKey, setVisibleApiKey,
    status, setStatus, isPending,
    contentRef, panelRef,
    analytics, analyticsLoading,
    analyticsPage, setAnalyticsPage,
    analyticsEndpointFilter, setAnalyticsEndpointFilter,
    analyticsStatusFilter, setAnalyticsStatusFilter,
    refresh, onSignOut, onMagicLink, onGoogle, createProject, rotateKey, topUp, flashCopy,
  }), [
    supabase, sessionReady, overview,
    selectedProjectId, projectDetail, detailStatus, detailLoading,
    activeSection, showProjectModal, newProjectName,
    visibleApiKey, status, isPending,
    analytics, analyticsLoading, analyticsPage, analyticsEndpointFilter, analyticsStatusFilter,
    refresh, onSignOut, onMagicLink, onGoogle, createProject, rotateKey, topUp, flashCopy,
  ]);

  return <DashContext.Provider value={value}>{children}</DashContext.Provider>;
}
