import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { AdminAuthError, checkOrigin, requireAdmin } from "@/lib/admin-auth";
import { checkAdminMutationRateLimit } from "@/lib/rate-limit";
import { ProblemStatement } from "@/models/ProblemStatement";

const identifier = (request: Request, email: string) =>
  `${email}:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`;

export async function POST(request: Request) {
  if (!checkOrigin(request)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  try {
    await connectToDatabase();
    const actor = await requireAdmin("admin");

    if (!(await checkAdminMutationRateLimit(identifier(request, actor.email))).allowed) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const result = await ProblemStatement.updateMany({ revealed: false }, { $set: { revealed: true } });

    return NextResponse.json({ revealed: result.modifiedCount });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to reveal problem statements", error);
    return NextResponse.json({ error: "Unable to reveal problem statements." }, { status: 500 });
  }
}