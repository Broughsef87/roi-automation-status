"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";

interface LastRun {
  status: "success" | "error" | "running" | "waiting" | "crashed";
  startedAt: string;
  stoppedAt: string | null;
  finished: boolean;
}

interface Workflow {
  id: string;
  name: string;
  active: boolean;
  lastRun: LastRun | null;
}

interface StatusData {
  workflows: Workflow[];
  fetchedAt: string;
  error?: string;
}

const WORKFLOW_LABELS: Record<string, { label: string; description: string }> = {
  "ROI — 1. Salesperson Pay Trigger":                        { label: "Salesperson Pay",          description: "Emails salesperson when commission is recorded" },
  "ROI — 2. Tentative Delivery Date Notification":           { label: "Tentative Delivery",        description: "Notifies customer when estimated ship date is set" },
  "ROI — 3. Confirmed Delivery Date Notification":           { label: "Confirmed Delivery",        description: "Sends confirmation when delivery date is locked" },
  "ROI — 4. Contract Signed → Accounting + Payment Kickoff": { label: "Contract Signed",           description: "Alerts accounting and kicks off payment schedule" },
  "ROI — 5. Payment Schedule Automation":                    { label: "Payment Schedule",          description: "Sends 30% deposit invoice, then 70% balance 2 wks out" },
  "ROI — 6. Ship Notice":                                    { label: "Ship Notice",               description: "Notifies customer when building has shipped" },
  "ROI — 7. Excel Poller (SharePoint)":                      { label: "SharePoint Watcher",        description: "Polls payment sheet every 15 min and triggers workflows" },
};

function statusColor(status: LastRun["status"] | undefined, active: boolean): string {
  if (!active) return "var(--roi-muted)";
  switch (status) {
    case "success":  return "var(--roi-green)";
    case "error":
    case "crashed":  return "var(--roi-red)";
    case "running":
    case "waiting":  return "var(--roi-amber)";
    default:         return "var(--roi-muted)";
  }
}

function statusLabel(run: LastRun | null, active: boolean): string {
  if (!active) return "Inactive";
  if (!run)    return "No runs yet";
  switch (run.status) {
    case "success":  return "Success";
    case "error":    return "Error";
    case "crashed":  return "Crashed";
    case "running":  return "Running";
    case "waiting":  return "Waiting";
    default:         return run.status;
  }
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)    return "just now";
  if (mins < 60)   return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

function duration(run: LastRun | null): string {
  if (!run?.stoppedAt || !run.startedAt) return "";
  const ms = new Date(run.stoppedAt).getTime() - new Date(run.startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function WorkflowCard({ wf }: { wf: Workflow }) {
  const meta  = WORKFLOW_LABELS[wf.name] ?? { label: wf.name.replace(/^ROI — \d+\. /, ""), description: "" };
  const color  = statusColor(wf.lastRun?.status, wf.active);
  const label  = statusLabel(wf.lastRun, wf.active);
  const dur    = duration(wf.lastRun);
  const isError = wf.lastRun?.status === "error" || wf.lastRun?.status === "crashed";
  const isRunning = wf.lastRun?.status === "running" || wf.lastRun?.status === "waiting";

  return (
    <div style={{
      background: "var(--roi-card)",
      border: `1px solid ${isError ? "var(--roi-red-dim)" : "var(--roi-border)"}`,
      borderRadius: "8px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      boxShadow: isError ? "0 0 0 1px var(--roi-red-dim)" : undefined,
      transition: "border-color 0.2s",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--roi-text)", marginBottom: "2px" }}>
            {meta.label}
          </div>
          <div style={{ fontSize: "12px", color: "var(--roi-muted)", lineHeight: 1.4 }}>
            {meta.description}
          </div>
        </div>
        {/* Status badge */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 10px",
          borderRadius: "20px",
          background: `${color}18`,
          border: `1px solid ${color}40`,
          flexShrink: 0,
          fontSize: "12px",
          fontWeight: 600,
          color,
          letterSpacing: "0.02em",
        }}>
          <span style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: color,
            flexShrink: 0,
            animation: isRunning ? "pulse-dot 1.4s ease-in-out infinite" : undefined,
          }} />
          {label}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "var(--roi-border)" }} />

      {/* Meta row */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "11px", color: "var(--roi-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Last run</div>
          <div style={{ fontSize: "13px", color: "var(--roi-text)" }}>
            {wf.lastRun ? timeAgo(wf.lastRun.startedAt) : "—"}
          </div>
        </div>
        {dur && (
          <div>
            <div style={{ fontSize: "11px", color: "var(--roi-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Duration</div>
            <div style={{ fontSize: "13px", color: "var(--roi-text)" }}>{dur}</div>
          </div>
        )}
        <div>
          <div style={{ fontSize: "11px", color: "var(--roi-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>Status</div>
          <div style={{ fontSize: "13px", color: wf.active ? "var(--roi-green)" : "var(--roi-muted)" }}>
            {wf.active ? "Active" : "Inactive"}
          </div>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: "16px", height: "16px", borderRadius: "50%",
      border: "2px solid var(--roi-border-hi)",
      borderTopColor: "var(--roi-red)",
      animation: "spin 0.7s linear infinite",
      display: "inline-block",
    }} />
  );
}

export default function StatusPage() {
  const [data, setData]       = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || `HTTP ${res.status}`);
        setData(null);
      } else {
        setData(json);
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  const successCount = data?.workflows.filter(w => w.lastRun?.status === "success").length ?? 0;
  const errorCount   = data?.workflows.filter(w => w.lastRun?.status === "error" || w.lastRun?.status === "crashed").length ?? 0;
  const totalCount   = data?.workflows.length ?? 0;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* Top accent line */}
      <div style={{ height: "4px", background: "linear-gradient(90deg, var(--roi-red-dark) 0%, var(--roi-red) 40%, var(--roi-red) 60%, var(--roi-red-dark) 100%)" }} />

      {/* Header */}
      <header style={{
        padding: "28px 32px 20px",
        borderBottom: "1px solid var(--roi-border)",
        background: "var(--roi-surface)",
      }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <Image
                src="/logo.png"
                alt="ROI Metal Buildings"
                width={220}
                height={46}
                style={{ display: "block", marginBottom: "6px" }}
                priority
              />
              <div style={{ fontSize: "13px", color: "var(--roi-muted)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Automation Status Dashboard
              </div>
            </div>

            {/* Stats + refresh indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              {data && (
                <div style={{ display: "flex", gap: "16px", fontSize: "13px" }}>
                  <span style={{ color: "var(--roi-green)" }}>{successCount} healthy</span>
                  {errorCount > 0 && <span style={{ color: "var(--roi-red)" }}>{errorCount} error{errorCount !== 1 ? "s" : ""}</span>}
                  <span style={{ color: "var(--roi-muted)" }}>{totalCount} total</span>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--roi-muted)", fontSize: "12px" }}>
                {loading ? <Spinner /> : (
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "var(--roi-green)", display: "inline-block" }} />
                )}
                {data ? `Updated ${timeAgo(data.fetchedAt)}` : "Loading…"}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Body */}
      <main style={{ flex: 1, padding: "32px", maxWidth: "960px", margin: "0 auto", width: "100%" }}>
        {error && (
          <div style={{
            padding: "16px 20px",
            borderRadius: "8px",
            background: "var(--roi-red-dim)",
            border: "1px solid var(--roi-red-glow)",
            color: "var(--roi-red)",
            marginBottom: "24px",
            fontSize: "14px",
          }}>
            <strong>Could not reach n8n:</strong> {error}
            <div style={{ marginTop: "6px", fontSize: "12px", color: "var(--roi-muted)" }}>
              Make sure n8n is running and N8N_BASE_URL is set correctly. Retrying automatically.
            </div>
          </div>
        )}

        {loading && !data && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--roi-muted)", padding: "40px 0" }}>
            <Spinner />
            <span>Loading workflows…</span>
          </div>
        )}

        {data && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}>
            {data.workflows.map((wf) => (
              <WorkflowCard key={wf.id} wf={wf} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer style={{
        padding: "16px 32px",
        borderTop: "1px solid var(--roi-border)",
        background: "var(--roi-surface)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "8px",
      }}>
        <div style={{ fontSize: "12px", color: "var(--roi-muted)" }}>
          Refreshes every 60 seconds automatically
        </div>
        <div style={{ fontSize: "12px", color: "var(--roi-muted)" }}>
          Powered by{" "}
          <span style={{ color: "var(--roi-red)", fontWeight: 600 }}>Forge Agency</span>
        </div>
      </footer>
    </div>
  );
}
