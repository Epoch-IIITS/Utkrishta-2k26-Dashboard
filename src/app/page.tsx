import Link from "next/link";
import { auth } from "@/auth";
import { getSettings } from "@/lib/settings";
import { eventDescription, eventName, prizePool } from "@/config/site";
import { Score } from "@/models/Score";
import { Team } from "@/models/Team";

export default async function HomePage() {
  const [session, settings] = await Promise.all([auth(), getSettings()]);
  const scores = settings.resultsPublished ? await Score.find({}).lean() : [];
  const teams = scores.length ? await Team.find({ _id: { $in: scores.map((score) => score.teamId) } }).select({ name: 1 }).lean() : [];
  const names = new Map(teams.map((team) => [String(team._id), team.name]));
  const podium = scores.map((score) => ({ name: names.get(String(score.teamId)), total: score.technical + score.innovation + score.functionality + score.impact + score.presentation })).filter((entry): entry is { name: string; total: number } => Boolean(entry.name)).sort((a, b) => b.total - a.total).slice(0, 3);
  return <main className="mx-auto min-h-screen max-w-5xl px-4 py-20 text-center sm:px-6"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">EPOCH · IIIT Sri City · Utkrishta 2026</p><h1 className="mt-4 text-5xl font-bold text-slate-950 sm:text-7xl">{eventName}</h1><p className="mx-auto mt-5 max-w-2xl text-lg text-slate-700">{eventDescription}</p><p className="mt-5 text-2xl font-semibold text-primary">Prize pool: {prizePool}</p><div className="mt-9 flex justify-center gap-4"><Link className="rounded bg-primary px-5 py-3 font-semibold text-white" href={session?.user ? "/team" : "/register-team"}>{session?.user ? "My team" : "Register your team"}</Link><Link className="rounded border border-primary px-5 py-3 font-semibold text-primary" href="/rules">Read the rules</Link></div><section className="mt-20"><h2 className="text-2xl font-bold">Leaderboard podium</h2>{!settings.resultsPublished ? <p className="mt-4 text-slate-600">Results coming soon</p> : <ol className="mx-auto mt-6 grid max-w-3xl gap-4 sm:grid-cols-3">{podium.map((team, index) => <li className="rounded-xl border bg-white p-5" key={team.name}><p className="text-primary">#{index + 1}</p><p className="mt-2 font-semibold">{team.name}</p><p>{team.total}/100</p></li>)}</ol>}</section></main>;
}
