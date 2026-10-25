import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { checkOrigin } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/db";
import { checkTeamRegistrationRateLimit } from "@/lib/rate-limit";
import { getRoleForEmail, normalizeEmail } from "@/lib/roles";
import { getSettings } from "@/lib/settings";
import { Team } from "@/models/Team";

const httpsUrl = z.string().trim().url().max(300).refine((value) => new URL(value).protocol === "https:");
const schema = z.object({ liveUrl: httpsUrl, repoUrl: httpsUrl.optional().nullable() }).strict();

function identifier(request: Request, email: string) {
  return `${email}:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`;
}

export async function PUT(request: Request) {
  if (!checkOrigin(request)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  try {
    await connectToDatabase();
    const rawEmail = (await auth())?.user?.email;
    if (!rawEmail) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    const email = normalizeEmail(rawEmail);
    if (await getRoleForEmail(email) !== "team_leader") return NextResponse.json({ error: "Only a team leader can save a submission." }, { status: 403 });
    const limited = await checkTeamRegistrationRateLimit(identifier(request, email));
    if (!limited.allowed) return NextResponse.json({ error: limited.reason === "limited" ? "Too many requests." : "Submissions are temporarily unavailable." }, { status: limited.reason === "limited" ? 429 : 503 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Use valid HTTPS submission URLs up to 300 characters." }, { status: 400 });
    if (!(await getSettings()).submissionsOpen) return NextResponse.json({ error: "Final submissions are not open." }, { status: 403 });
    const team = await Team.findOneAndUpdate({ leaderEmail: email }, { $set: { liveUrl: parsed.data.liveUrl, repoUrl: parsed.data.repoUrl ?? null } });
    if (!team) throw new SubmissionError("Team not found.", 404);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SubmissionError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid submission request." }, { status: 400 });
    console.error("Failed to save team submission", error);
    return NextResponse.json({ error: "Unable to save submission." }, { status: 500 });
  }
}

class SubmissionError extends Error { constructor(message: string, public readonly status: 404 | 409) { super(message); } }
