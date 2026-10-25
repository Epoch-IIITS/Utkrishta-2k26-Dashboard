import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { checkOrigin } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/db";
import { getRoleForEmail, normalizeEmail } from "@/lib/roles";
import { getSettings } from "@/lib/settings";
import { ProblemStatement } from "@/models/ProblemStatement";
import { Team } from "@/models/Team";
import { TeamMember } from "@/models/TeamMember";

const schema = z.object({ problemStatementId: z.string().regex(/^[0-9a-f]{24}$/i) }).strict();
export async function POST(request: Request) {
  if (!checkOrigin(request)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  try {
    await connectToDatabase();
    const email = (await auth())?.user?.email;
    if (!email) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const normalizedEmail = normalizeEmail(email);
    const role = await getRoleForEmail(normalizedEmail);
    if (role === "admin") return NextResponse.json({ error: "Admins cannot choose a problem statement." }, { status: 403 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid problem statement." }, { status: 400 });
    if (!(await getSettings()).registrationOpen) return NextResponse.json({ error: "Problem statement selection is closed." }, { status: 403 });
    const membership = role === "team_leader" ? null : await TeamMember.findOne({ email: normalizedEmail }).select({ teamId: 1 }).lean<{ teamId: unknown }>();
    const team = await Team.findOne(role === "team_leader" ? { leaderEmail: normalizedEmail } : { _id: membership?.teamId });
    if (!team) return NextResponse.json({ error: "Team not found." }, { status: 404 });
    if (!await ProblemStatement.exists({ _id: parsed.data.problemStatementId, revealed: true })) return NextResponse.json({ error: "That problem statement is not available." }, { status: 400 });
    team.assignedPsId = parsed.data.problemStatementId as never;
    await team.save();
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    console.error("Failed to choose problem statement", error);
    return NextResponse.json({ error: "Unable to choose problem statement." }, { status: 500 });
  }
}
