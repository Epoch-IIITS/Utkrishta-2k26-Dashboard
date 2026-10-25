import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError, checkOrigin, isValidObjectId, requireAdmin } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/db";
import { checkAdminMutationRateLimit, checkScoreSubmissionRateLimit } from "@/lib/rate-limit";
import { Score } from "@/models/Score";
import { Team } from "@/models/Team";

const schema = z.object({ technical: z.number().int().min(0).max(25), innovation: z.number().int().min(0).max(20), functionality: z.number().int().min(0).max(20), impact: z.number().int().min(0).max(20), presentation: z.number().int().min(0).max(15) }).strict();
type Params = { params: Promise<{ teamId: string }> };
const identifier = (request: Request, email: string) => `${email}:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`;

export async function PUT(request: Request, { params }: Params) {
  if (!checkOrigin(request)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { teamId } = await params;
  if (!isValidObjectId(teamId)) return NextResponse.json({ error: "Invalid team ID." }, { status: 400 });
  try {
    await connectToDatabase();
    const actor = await requireAdmin("admin");
    const [adminLimit, scoreLimit] = await Promise.all([checkAdminMutationRateLimit(identifier(request, actor.email)), checkScoreSubmissionRateLimit(identifier(request, actor.email))]);
    if (!adminLimit.allowed || !scoreLimit.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Scores must be whole numbers within each criterion's range." }, { status: 400 });
    if (!await Team.exists({ _id: teamId })) return NextResponse.json({ error: "Team not found." }, { status: 404 });
    await Score.findOneAndUpdate({ teamId }, { $set: parsed.data }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid score data." }, { status: 400 });
    console.error("Failed to save score", error);
    return NextResponse.json({ error: "Unable to save score." }, { status: 500 });
  }
}
