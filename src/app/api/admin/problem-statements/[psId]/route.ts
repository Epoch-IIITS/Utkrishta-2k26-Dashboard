import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError, checkOrigin, isValidObjectId, requireAdmin } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/db";
import { checkAdminMutationRateLimit } from "@/lib/rate-limit";
import { ProblemStatement } from "@/models/ProblemStatement";
import { Team } from "@/models/Team";

const schema = z.object({ title: z.string().trim().min(1).max(300), domain: z.string().trim().min(1).max(80), description: z.string().trim().min(1).max(5000), revealed: z.boolean().optional() }).strict();
type Params = { params: Promise<{ psId: string }> };
const identifier = (request: Request, email: string) => `${email}:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`;
async function authorize(request: Request) {
  const actor = await requireAdmin("admin");
  if (!(await checkAdminMutationRateLimit(identifier(request, actor.email))).allowed) throw new Error("LIMITED");
}
export async function PATCH(request: Request, { params }: Params) {
  if (!checkOrigin(request)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { psId } = await params;
  if (!isValidObjectId(psId)) return NextResponse.json({ error: "Invalid problem statement ID." }, { status: 400 });
  try { await connectToDatabase(); await authorize(request); const body = schema.safeParse(await request.json()); if (!body.success) return NextResponse.json({ error: "Invalid problem statement data." }, { status: 400 }); if (!await ProblemStatement.findByIdAndUpdate(psId, { $set: body.data })) return NextResponse.json({ error: "Problem statement not found." }, { status: 404 }); return NextResponse.json({ ok: true }); } catch (error) { if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status }); if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid request." }, { status: 400 }); return NextResponse.json({ error: "Unable to update problem statement." }, { status: 500 }); }
}
export async function DELETE(request: Request, { params }: Params) {
  if (!checkOrigin(request)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { psId } = await params;
  if (!isValidObjectId(psId)) return NextResponse.json({ error: "Invalid problem statement ID." }, { status: 400 });
  try { await connectToDatabase(); await authorize(request); const deleted = await ProblemStatement.findByIdAndDelete(psId); if (!deleted) return NextResponse.json({ error: "Problem statement not found." }, { status: 404 }); await Team.updateMany({ assignedPsId: psId }, { $set: { assignedPsId: null } }); return NextResponse.json({ deleted: true }); } catch (error) { if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status }); return NextResponse.json({ error: "Unable to delete problem statement." }, { status: 500 }); }
}
