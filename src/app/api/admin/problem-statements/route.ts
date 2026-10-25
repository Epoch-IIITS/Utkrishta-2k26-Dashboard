import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { AdminAuthError, checkOrigin, requireAdmin } from "@/lib/admin-auth";
import { checkAdminMutationRateLimit } from "@/lib/rate-limit";
import { ProblemStatement } from "@/models/ProblemStatement";

function getIdentifier(request: Request, email: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return `${email}:${ip}`;
}

export async function POST(request: Request) {
  if (!checkOrigin(request)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  try {
    await connectToDatabase();
    const actor = await requireAdmin("admin");

    const rl = await checkAdminMutationRateLimit(getIdentifier(request, actor.email));
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

    const psSchema = z
      .object({
        title: z.string().trim().min(1).max(300),
        domain: z.string().trim().min(1).max(80),
        description: z.string().trim().min(1).max(5000),
      })
      .strict();

    const parsed = psSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid problem statement data." }, { status: 400 });

    const [ps] = await ProblemStatement.create([parsed.data]);
    return NextResponse.json({ id: String(ps._id) }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid problem statement data." }, { status: 400 });
    console.error("Failed to create problem statement", error);
    return NextResponse.json({ error: "Unable to create problem statement." }, { status: 500 });
  }
}
