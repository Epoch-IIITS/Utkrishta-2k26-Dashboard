import { NextResponse } from "next/server";
import type { Types } from "mongoose";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { getRoleForEmail, normalizeEmail } from "@/lib/roles";
import { getSettings } from "@/lib/settings";
import { ProblemStatement } from "@/models/ProblemStatement";
import { Score } from "@/models/Score";
import { Team } from "@/models/Team";

type ScoreRow = {
  teamId: Types.ObjectId;
  technical: number;
  innovation: number;
  functionality: number;
  impact: number;
  presentation: number;
};

type TeamRow = { _id: Types.ObjectId; name: string; assignedPsId: Types.ObjectId | null };

export async function GET() {
  try {
    await connectToDatabase();

    const rawEmail = (await auth())?.user?.email;
    const isAdmin = rawEmail ? (await getRoleForEmail(normalizeEmail(rawEmail))) === "admin" : false;

    const settings = await getSettings();
    if (!settings.resultsPublished && !isAdmin) {
      return NextResponse.json({ error: "Results have not been published yet." }, { status: 403 });
    }

    const scores = await Score.find({}).lean<ScoreRow[]>();
    const teams = await Team.find({ _id: { $in: scores.map((score) => score.teamId) } })
      .select({ name: 1, assignedPsId: 1 })
      .lean<TeamRow[]>();

    const statementIds = teams.flatMap((team) => (team.assignedPsId ? [team.assignedPsId] : []));
    const statements = statementIds.length
      ? await ProblemStatement.find({ _id: { $in: statementIds } }).select({ title: 1 }).lean<Array<{ _id: Types.ObjectId; title: string }>>()
      : [];

    const teamsById = new Map(teams.map((team) => [String(team._id), team]));
    const titlesById = new Map(statements.map((statement) => [String(statement._id), statement.title]));

    const rows = scores
      .flatMap((score) => {
        const team = teamsById.get(String(score.teamId));
        if (!team) return [];
        const total = score.technical + score.innovation + score.functionality + score.impact + score.presentation;
        return [
          {
            teamId: String(team._id),
            name: team.name,
            problemStatement: team.assignedPsId ? titlesById.get(String(team.assignedPsId)) ?? null : null,
            total,
            ...(isAdmin
              ? {
                  breakdown: {
                    technical: score.technical,
                    innovation: score.innovation,
                    functionality: score.functionality,
                    impact: score.impact,
                    presentation: score.presentation,
                  },
                }
              : {}),
          },
        ];
      })
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    // Teams with equal totals share a rank (1, 1, 3, ...).
    const leaderboard = rows.map((row, index) => {
      const firstWithSameTotal = rows.findIndex((other) => other.total === row.total);
      return { rank: firstWithSameTotal + 1, ...row };
    });

    return NextResponse.json({ view: settings.resultsPublished ? "published" : "admin_preview", leaderboard });
  } catch (error) {
    console.error("Unable to calculate results", error);
    return NextResponse.json({ error: "Unable to load results." }, { status: 500 });
  }
}