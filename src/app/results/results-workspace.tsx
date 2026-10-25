"use client";

import Link from "next/link";
import useSWR from "swr";

type Breakdown = {
  technical: number;
  innovation: number;
  functionality: number;
  impact: number;
  presentation: number;
};

type Result = {
  rank: number;
  teamId: string;
  name: string;
  problemStatement: string | null;
  total: number;
  breakdown?: Breakdown;
};

type ResultsResponse = { leaderboard: Result[]; view: "published" | "admin_preview" };

const CRITERIA: Array<{ key: keyof Breakdown; label: string; max: number }> = [
  { key: "technical", label: "Technical Implementation", max: 25 },
  { key: "innovation", label: "Innovation & Originality", max: 20 },
  { key: "functionality", label: "Functionality & Execution", max: 20 },
  { key: "impact", label: "Problem Relevance & Impact", max: 20 },
  { key: "presentation", label: "Presentation & Defense", max: 15 },
];

const fetcher = async (url: string): Promise<ResultsResponse> => {
  const response = await fetch(url, { cache: "no-store" });
  const body = (await response.json()) as ResultsResponse & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Unable to load results.");
  return body;
};

function Leaderboard({ results }: { results: Result[] }) {
  if (results.length === 0) {
    return <p className="mt-8 rounded-xl border border-slate-200 bg-white p-5 text-slate-600">No teams have been scored yet.</p>;
  }

  return (
    <ol className="mt-8 space-y-4" aria-label="Leaderboard">
      {results.map((result) => (
        <li className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" key={result.teamId}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Rank {result.rank}</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-950">{result.name}</h2>
              <p className="mt-1 text-sm text-slate-600">Problem statement: {result.problemStatement ?? "Not selected"}</p>
            </div>
            <p className="text-lg font-bold text-slate-950">{result.total} / 100</p>
          </div>
          {result.breakdown && (
            <dl className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
              {CRITERIA.map((criterion) => (
                <div key={criterion.key}>
                  <dt className="text-slate-500">{criterion.label}</dt>
                  <dd className="mt-1 font-semibold">
                    {result.breakdown?.[criterion.key]} / {criterion.max}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </li>
      ))}
    </ol>
  );
}

export function ResultsWorkspace({ showTeamLink }: { showTeamLink: boolean }) {
  const { data, error, isLoading } = useSWR("/api/results", fetcher);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 sm:px-6">
      <nav aria-label="Main navigation" className="mb-8 flex flex-wrap gap-4 text-sm font-semibold text-primary">
        <Link href="/">Home</Link>
        <Link href="/rules">Rules</Link>
        {showTeamLink && <Link href="/team">My team</Link>}
      </nav>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Neural Forge</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Leaderboard</h1>
      <p className="mt-3 max-w-2xl text-slate-600">
        Teams are ranked by the judges&apos; total score out of 100 from the in-person evaluation. Teams with equal totals share a rank.
      </p>
      {isLoading && (
        <p className="mt-8 text-slate-600" role="status">
          Loading results…
        </p>
      )}
      {error && (
        <p className="mt-8 rounded-md bg-red-50 p-4 text-red-800" role="alert">
          {error.message}
        </p>
      )}
      {data?.view === "admin_preview" && (
        <p className="mt-6 rounded-md bg-amber-50 p-4 text-amber-900" role="status">
          Admin preview: these results stay hidden from everyone else until an admin publishes them.
        </p>
      )}
      {data && <Leaderboard results={data.leaderboard} />}
    </main>
  );
}