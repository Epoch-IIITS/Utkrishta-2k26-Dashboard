import { NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/db";
import { Score } from "@/models/Score";
import { Team } from "@/models/Team";

export async function GET() {
  try {
    await connectToDatabase();
    await requireAdmin("admin");
    const teams = await Team.find({}).select({ name: 1, liveUrl: 1, repoUrl: 1 }).sort({ name: 1 }).lean();
    const scores = await Score.find({ teamId: { $in: teams.map((team) => team._id) } }).lean();
    const byTeam = new Map(scores.map((score) => [String(score.teamId), score]));
    return NextResponse.json({ teams: teams.map((team) => {
      const score = byTeam.get(String(team._id));
      return { id: String(team._id), name: team.name, liveUrl: team.liveUrl, repoUrl: team.repoUrl, scores: score ? { technical: score.technical, innovation: score.innovation, functionality: score.functionality, impact: score.impact, presentation: score.presentation } : null };
    }) });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to load scores", error);
    return NextResponse.json({ error: "Unable to load scores." }, { status: 500 });
  }
}
