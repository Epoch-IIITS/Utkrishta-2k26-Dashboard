import { NextResponse } from "next/server";
import { AdminAuthError, checkOrigin, isValidObjectId, requireAdmin } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/db";
import { checkAdminMutationRateLimit } from "@/lib/rate-limit";
import { ProblemStatement } from "@/models/ProblemStatement";
type Params = { params: Promise<{ psId: string }> };
export async function POST(request: Request, { params }: Params) {
  if (!checkOrigin(request)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { psId } = await params; if (!isValidObjectId(psId)) return NextResponse.json({ error: "Invalid problem statement ID." }, { status: 400 });
  try { await connectToDatabase(); const actor = await requireAdmin("admin"); if (!(await checkAdminMutationRateLimit(`${actor.email}:${request.headers.get("x-forwarded-for") ?? "unknown"}`)).allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 }); if (!await ProblemStatement.findByIdAndUpdate(psId, { $set: { revealed: true } })) return NextResponse.json({ error: "Problem statement not found." }, { status: 404 }); return NextResponse.json({ ok: true }); } catch (error) { if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status }); return NextResponse.json({ error: "Unable to reveal problem statement." }, { status: 500 }); }
}
