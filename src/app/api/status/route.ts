import { NextResponse } from "next/server";

const N8N_BASE = process.env.N8N_BASE_URL || "http://localhost:5679";
const N8N_KEY  = process.env.N8N_API_KEY  || "";

const HEADERS = {
  "X-N8N-API-KEY":               N8N_KEY,
  "Content-Type":                "application/json",
  "ngrok-skip-browser-warning":  "true",
};

export const revalidate = 0;

interface N8NWorkflow {
  id: string;
  name: string;
  active: boolean;
  updatedAt: string;
}

interface N8NExecution {
  id: string;
  status: "success" | "error" | "running" | "waiting" | "crashed";
  startedAt: string;
  stoppedAt: string | null;
  finished: boolean;
}

export async function GET() {
  if (!N8N_KEY) {
    return NextResponse.json({ error: "N8N_API_KEY not configured" }, { status: 500 });
  }

  try {
    const wfRes = await fetch(`${N8N_BASE}/api/v1/workflows?limit=50`, {
      headers: HEADERS,
      cache: "no-store",
    });

    if (!wfRes.ok) {
      return NextResponse.json(
        { error: `n8n API error: ${wfRes.status} ${wfRes.statusText}` },
        { status: 502 }
      );
    }

    const wfData = await wfRes.json();
    const allWorkflows: N8NWorkflow[] = wfData.data || [];
    const roiWorkflows = allWorkflows.filter((w) => w.name.startsWith("ROI —"));

    const results = await Promise.all(
      roiWorkflows.map(async (wf) => {
        try {
          const execRes = await fetch(
            `${N8N_BASE}/api/v1/executions?workflowId=${wf.id}&limit=1&includeData=false`,
            { headers: HEADERS, cache: "no-store" }
          );
          const execData = execRes.ok ? await execRes.json() : { data: [] };
          const lastExec: N8NExecution | null = execData.data?.[0] ?? null;

          return {
            id: wf.id,
            name: wf.name,
            active: wf.active,
            lastRun: lastExec
              ? {
                  status: lastExec.status,
                  startedAt: lastExec.startedAt,
                  stoppedAt: lastExec.stoppedAt,
                  finished: lastExec.finished,
                }
              : null,
          };
        } catch {
          return {
            id: wf.id,
            name: wf.name,
            active: wf.active,
            lastRun: null,
          };
        }
      })
    );

    // Sort by the workflow number in the name (ROI — 1., ROI — 2., etc.)
    results.sort((a, b) => {
      const numA = parseInt(a.name.match(/ROI — (\d+)\./)?.[1] ?? "99");
      const numB = parseInt(b.name.match(/ROI — (\d+)\./)?.[1] ?? "99");
      return numA - numB;
    });

    return NextResponse.json({ workflows: results, fetchedAt: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to reach n8n: ${msg}` }, { status: 503 });
  }
}
