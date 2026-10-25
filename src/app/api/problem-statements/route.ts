import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import { ProblemStatement } from "@/models/ProblemStatement";
import { getRoleForEmail, normalizeEmail } from "@/lib/roles";

export async function GET() {
  try {
    await connectToDatabase();
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const email = normalizeEmail(session.user.email);
    const role = await getRoleForEmail(email);
    const filter = role === "admin" ? {} : { revealed: true };
    const psList = await ProblemStatement.find(filter).sort({ createdAt: 1 }).lean();
    return NextResponse.json({
      problemStatements: psList.map((ps) => ({
        id: String(ps._id),
        title: ps.title,
        domain: ps.domain,
        description: ps.description,
        revealed: ps.revealed,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch problem statements", error);
    return NextResponse.json({ error: "Unable to load problem statements." }, { status: 500 });
  }
}
