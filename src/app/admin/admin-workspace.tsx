"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";

type Section = "problem-statements" | "teams" | "scores" | "users";

type PsItem = {
  id: string;
  title: string;
  domain: string;
  description: string;
  revealed: boolean;
};

type TeamItem = {
  id: string;
  name: string;
  leaderEmail: string;
  previousHackathonExperience: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  rulesAcceptedAt: string | null;
  liveUrl?: string | null;
  repoUrl?: string | null;
  assignment: { problemStatementId: string; title: string | null } | null;
  members: Array<{ name: string; email: string; phone: string | null; rollNumber: string; year: string; branch: string }>;
};

const CRITERIA = [
  { key: "technical", label: "Technical Implementation", max: 25 },
  { key: "innovation", label: "Innovation & Originality", max: 20 },
  { key: "functionality", label: "Functionality & Execution", max: 20 },
  { key: "impact", label: "Problem Relevance & Impact", max: 20 },
  { key: "presentation", label: "Presentation & Defense", max: 15 },
] as const;

type CriterionKey = (typeof CRITERIA)[number]["key"];
type ScoreValues = Record<CriterionKey, number>;
type ScoreTeam = { id: string; name: string; liveUrl: string | null; repoUrl: string | null; scores: ScoreValues | null };

type RoleList = { admins: Array<{ email: string; addedAt: string }> };

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers } });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "The request could not be completed.");
  return data;
}

function PageHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Administration</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
      <p className="mt-3 text-slate-600">{description}</p>
    </div>
  );
}

function Message({ error, message }: { error: string | null; message: string | null }) {
  return (
    <>
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p>}
      {message && <p className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{message}</p>}
    </>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">{children}</section>;
}

function useData<T>(loader: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load data.");
    } finally {
      setLoading(false);
    }
  }, [loader]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void reload();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reload]);
  return { data, error, loading, reload, setData };
}

function ProblemStatementsWorkspace() {
  const load = useCallback(async () => (await requestJson<{ problemStatements: PsItem[] }>("/api/problem-statements")).problemStatements, []);
  const { data: items, error, loading, reload } = useData(load);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setActionError(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await requestJson("/api/admin/problem-statements", {
        method: "POST",
        body: JSON.stringify({ title: form.get("title"), domain: form.get("domain"), description: form.get("description") }),
      });
      formElement.reset();
      setNotice("Problem statement created.");
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to create problem statement.");
    } finally {
      setBusy(false);
    }
  }

  async function action(id: string, op: "reveal" | "reveal-all" | "delete") {
    const label = op === "reveal-all" ? "Reveal all problem statements (this cannot be undone)" : op === "reveal" ? "Reveal this problem statement (this cannot be undone)" : "Delete this problem statement";
    if (!window.confirm(`${label}?`)) return;
    setBusy(true);
    setActionError(null);
    setNotice(null);
    try {
      const url = op === "reveal-all" ? "/api/admin/problem-statements/reveal-all" : op === "reveal" ? `/api/admin/problem-statements/${id}/reveal` : `/api/admin/problem-statements/${id}`;
      await requestJson(url, { method: op === "delete" ? "DELETE" : "POST" });
      setNotice(op === "delete" ? "Problem statement deleted." : "Problem statement revealed.");
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to update problem statement.");
    } finally {
      setBusy(false);
    }
  }

  async function updatePs(event: FormEvent<HTMLFormElement>, ps: PsItem) {
    event.preventDefault();
    setBusy(true);
    setActionError(null);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    try {
      await requestJson(`/api/admin/problem-statements/${ps.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: form.get("title"), domain: form.get("domain"), description: form.get("description") }),
      });
      setNotice("Problem statement updated.");
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to update problem statement.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading title="Problem statements" description="Create problem statements and reveal them to teams on Day 1." />
        <button disabled={busy} onClick={() => void action("", "reveal-all")} className="rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary">
          Reveal all
        </button>
      </div>
      <Message error={actionError} message={notice} />
      <Card>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={create}>
          <h2 className="text-lg font-semibold md:col-span-2">Create a problem statement</h2>
          <input required name="title" placeholder="Title" className="rounded-md border border-slate-300 px-3 py-2" />
          <input required name="domain" placeholder="Area (for example, NLP, Computer Vision)" className="rounded-md border border-slate-300 px-3 py-2" />
          <textarea required name="description" placeholder="Description, criteria and dataset links" className="min-h-24 rounded-md border border-slate-300 px-3 py-2 md:col-span-2" />
          <button disabled={busy} className="w-fit rounded-md bg-primary px-4 py-2 font-semibold text-white disabled:bg-slate-400">
            {busy ? "Saving…" : "Create problem statement"}
          </button>
        </form>
      </Card>
      {loading ? (
        <p>Loading problem statements…</p>
      ) : error ? (
        <p className="rounded-md bg-red-50 p-4 text-red-800" role="alert">{error}</p>
      ) : (
        <div className="grid gap-4">
          {(items ?? []).map((ps) => (
            <Card key={ps.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-slate-950">{ps.title}</h2>
                  <p className="mt-1 text-sm font-medium text-primary">Area: {ps.domain} · {ps.revealed ? "Revealed" : "Hidden"}</p>
                  <p className="mt-2 text-sm text-slate-700">{ps.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!ps.revealed && (
                    <button disabled={busy} onClick={() => void action(ps.id, "reveal")} className="rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary">
                      Reveal
                    </button>
                  )}
                  <button disabled={busy} onClick={() => void action(ps.id, "delete")} className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700">
                    Delete
                  </button>
                </div>
              </div>
              <details className="mt-4 border-t border-slate-200 pt-3">
                <summary className="cursor-pointer text-sm font-semibold text-primary">Edit details</summary>
                <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={(event) => void updatePs(event, ps)}>
                  <input required name="title" defaultValue={ps.title} className="rounded-md border border-slate-300 px-3 py-2" />
                  <input required name="domain" defaultValue={ps.domain} className="rounded-md border border-slate-300 px-3 py-2" />
                  <textarea required name="description" defaultValue={ps.description} className="min-h-24 rounded-md border border-slate-300 px-3 py-2 md:col-span-2" />
                  <button disabled={busy} className="w-fit rounded-md border border-slate-300 px-4 py-2 font-semibold">Save changes</button>
                </form>
              </details>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

function TeamsWorkspace() {
  const load = useCallback(async () => (await requestJson<{ teams: TeamItem[] }>("/api/admin/teams")).teams, []);
  const { data: teams, error, loading, reload } = useData(load);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(teamId: string, label: string, url: string, init: RequestInit): Promise<boolean> {
    setBusyId(teamId);
    setNotice(null);
    setActionError(null);
    try {
      try {
        await requestJson(url, init);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "";
        if (message.includes("needs confirmation") && init.method === "PATCH" && typeof init.body === "string" && window.confirm("Confirm this one-team size exception?")) {
          const original = JSON.parse(init.body) as Record<string, unknown>;
          await requestJson(url, { ...init, body: JSON.stringify({ ...original, confirmSizeException: true }) });
        } else {
          throw cause;
        }
      }
      setNotice(label);
      await reload();
      return true;
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to update team.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function addMember(event: FormEvent<HTMLFormElement>, teamId: string) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const rollNumber = window.prompt("Member roll number:");
    const year = window.prompt("Member year (UG1, UG2, UG3, or UG4):");
    const branch = window.prompt("Member branch:");
    if (!rollNumber || !year || !branch) return;
    const payload = { action: "add", member: { name: form.get("name"), email: form.get("email"), rollNumber, year, branch } };
    const saved = await run(teamId, "Member added.", `/api/admin/teams/${teamId}/members`, { method: "PATCH", body: JSON.stringify(payload) });
    if (saved) formElement.reset();
  }

  async function removeMember(teamId: string, email: string) {
    await run(teamId, "Member removed.", `/api/admin/teams/${teamId}/members`, { method: "PATCH", body: JSON.stringify({ action: "remove", memberEmail: email }) });
  }

  return (
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-10 sm:px-6">
      <PageHeading title="Teams" description="Review registered teams, manage members, and transfer leadership." />
      <Message error={actionError} message={notice} />
      {loading ? (
        <p>Loading teams…</p>
      ) : error ? (
        <p className="rounded-md bg-red-50 p-4 text-red-800" role="alert">{error}</p>
      ) : (
        <div className="grid gap-4">
          {(teams ?? []).map((team) => (
            <Card key={team.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">{team.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">Leader: {team.leaderEmail}</p>
                  <p className="mt-1 text-sm text-slate-600">Problem statement: {team.assignment?.title ?? "Not selected"}</p>
                </div>
                <button
                  disabled={Boolean(busyId)}
                  onClick={() => {
                    if (window.confirm(`Delete ${team.name}?`)) void run(team.id, "Team deleted.", `/api/admin/teams/${team.id}`, { method: "DELETE" });
                  }}
                  className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700"
                >
                  Delete team
                </button>
              </div>
              <div className="mt-4 grid gap-4 border-t border-slate-200 pt-4 md:grid-cols-2">
                <div>
                  <h3 className="font-semibold">Members ({team.members.length} of 4)</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {team.members.map((member) => (
                      <li className="flex flex-wrap items-center justify-between gap-2" key={member.email}>
                        <span>{member.name} · {member.email}</span>
                        {member.email !== team.leaderEmail && (
                          <button disabled={Boolean(busyId)} className="text-red-700 underline" onClick={() => void removeMember(team.id, member.email)}>
                            Remove
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={(event) => void addMember(event, team.id)}>
                    <input required name="name" placeholder="Member name" className="rounded-md border border-slate-300 px-3 py-2" />
                    <input required name="email" type="email" placeholder="Member email" className="rounded-md border border-slate-300 px-3 py-2" />
                    <button disabled={Boolean(busyId)} className="w-fit rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">Add member</button>
                  </form>
                </div>
                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const newLeaderEmail = String(form.get("email") ?? "");
                    void run(team.id, "Leadership transferred.", `/api/admin/teams/${team.id}/transfer-leader`, { method: "POST", body: JSON.stringify({ newLeaderEmail }) });
                  }}
                >
                  <h3 className="font-semibold">Transfer leadership</h3>
                  <p className="text-sm text-slate-600">Choose an existing team member.</p>
                  <select required name="email" className="w-full rounded-md border border-slate-300 px-3 py-2">
                    <option value="">Select member</option>
                    {team.members.filter((member) => member.email !== team.leaderEmail).map((member) => (
                      <option key={member.email} value={member.email}>{member.name}</option>
                    ))}
                  </select>
                  <button disabled={Boolean(busyId)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">Transfer leader</button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

function ScoreCard({ team, busy, onSave }: { team: ScoreTeam; busy: boolean; onSave: (teamId: string, scores: ScoreValues) => Promise<void> }) {
  const total = team.scores ? CRITERIA.reduce((sum, criterion) => sum + (team.scores?.[criterion.key] ?? 0), 0) : null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const scores = {} as ScoreValues;
    for (const criterion of CRITERIA) {
      const value = Number(form.get(criterion.key));
      if (!Number.isFinite(value) || value < 0 || value > criterion.max) {
        window.alert(`${criterion.label} must be between 0 and ${criterion.max}.`);
        return;
      }
      scores[criterion.key] = value;
    }
    void onSave(team.id, scores);
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{team.name}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Live: {team.liveUrl ? <a className="text-primary underline" href={team.liveUrl} target="_blank" rel="noreferrer">{team.liveUrl}</a> : "Not submitted"}
            {" · "}
            Repo: {team.repoUrl ? <a className="text-primary underline" href={team.repoUrl} target="_blank" rel="noreferrer">{team.repoUrl}</a> : "Not submitted"}
          </p>
        </div>
        <p className="text-sm font-semibold text-slate-800">{total === null ? "Not scored" : `Total: ${total} / 100`}</p>
      </div>
      <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={submit}>
        {CRITERIA.map((criterion) => (
          <label className="text-sm text-slate-700" key={criterion.key}>
            {criterion.label} (max {criterion.max})
            <input
              required
              name={criterion.key}
              type="number"
              min="0"
              max={criterion.max}
              step="0.5"
              defaultValue={team.scores?.[criterion.key] ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        ))}
        <button disabled={busy} className="w-fit rounded-md bg-primary px-4 py-2 font-semibold text-white disabled:bg-slate-400 sm:col-span-2 lg:col-span-5">
          {busy ? "Saving…" : "Save scores"}
        </button>
      </form>
    </Card>
  );
}

function ScoresWorkspace() {
  const load = useCallback(async () => (await requestJson<{ teams: ScoreTeam[] }>("/api/admin/scores")).teams, []);
  const { data: teams, error, loading, reload } = useData(load);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function save(teamId: string, scores: ScoreValues) {
    setBusyId(teamId);
    setNotice(null);
    setActionError(null);
    try {
      await requestJson(`/api/admin/scores/${teamId}`, { method: "PUT", body: JSON.stringify(scores) });
      setNotice("Scores saved. The leaderboard is updated.");
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to save scores.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-10 sm:px-6">
      <PageHeading title="Scores" description="Enter the evaluation scores after each team's in-person defense. The leaderboard ranks teams by the total out of 100." />
      <Message error={actionError} message={notice} />
      {loading ? (
        <p>Loading teams…</p>
      ) : error ? (
        <p className="rounded-md bg-red-50 p-4 text-red-800" role="alert">{error}</p>
      ) : (
        <div className="grid gap-4">
          {(teams ?? []).map((team) => (
            <ScoreCard key={team.id} team={team} busy={busyId === team.id} onSave={save} />
          ))}
        </div>
      )}
    </main>
  );
}

function UsersWorkspace() {
  const load = useCallback(async () => requestJson<RoleList>("/api/admin/users"), []);
  const { data, error, loading, reload } = useData(load);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function mutate(method: "POST" | "DELETE", targetEmail: string) {
    setBusy(true);
    setNotice(null);
    setActionError(null);
    try {
      await requestJson("/api/admin/users", { method, body: JSON.stringify({ role: "admin", email: targetEmail }) });
      setNotice(method === "POST" ? "Access granted." : "Access revoked.");
      if (method === "POST") setEmail("");
      await reload();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to update access.");
    } finally {
      setBusy(false);
    }
  }

  const admins = data?.admins ?? [];

  return (
    <main className="mx-auto max-w-6xl space-y-7 px-4 py-10 sm:px-6">
      <PageHeading title="Admins" description="Manage who can access the admin area." />
      <Message error={actionError} message={notice} />
      {loading ? (
        <p>Loading admins…</p>
      ) : error ? (
        <p className="rounded-md bg-red-50 p-4 text-red-800" role="alert">{error}</p>
      ) : (
        <>
          <Card>
            <form
              className="grid gap-3 sm:grid-cols-[1fr_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                void mutate("POST", email);
              }}
            >
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="rounded-md border border-slate-300 px-3 py-2" />
              <button disabled={busy} className="rounded-md bg-primary px-4 py-2 font-semibold text-white disabled:bg-slate-400">Grant admin access</button>
            </form>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold">Admins ({admins.length})</h2>
            {admins.length === 0 ? (
              <p className="mt-3 text-sm text-slate-600">No accounts listed.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200">
                {admins.map((entry) => (
                  <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={entry.email}>
                    <span className="text-sm text-slate-800">{entry.email}</span>
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(`Revoke admin access for ${entry.email}?`)) void mutate("DELETE", entry.email);
                      }}
                      className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700"
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </main>
  );
}

export function AdminWorkspace({ section }: { section: Section }) {
  if (section === "problem-statements") return <ProblemStatementsWorkspace />;
  if (section === "teams") return <TeamsWorkspace />;
  if (section === "scores") return <ScoresWorkspace />;
  return <UsersWorkspace />;
}