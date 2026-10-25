import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError, checkOrigin, requireAdmin } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/db";
import { checkAdminMutationRateLimit } from "@/lib/rate-limit";
import { getAdminEmails, isAllowedDomain, normalizeEmail } from "@/lib/roles";
import { AdminAllowlist } from "@/models/AdminAllowlist";
import { Team } from "@/models/Team";
import { TeamMember } from "@/models/TeamMember";

const mutationSchema = z
  .object({
    role: z.literal("admin"),
    email: z.string().trim().email().max(254),
  })
  .strict();

class OriginError extends Error {}
class RateLimitError extends Error {
  constructor(public readonly status: 429 | 503) {
    super("Rate limit check did not allow this request.");
  }
}
class RoleConflictError extends Error {}
class InvalidRoleEmailError extends Error {}
class RoleNotFoundError extends Error {}

function identifier(request: Request, email: string) {
  return `${email}:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`;
}

async function authorize(request: Request, mutate: boolean) {
  if (mutate && !checkOrigin(request)) throw new OriginError();
  const actor = await requireAdmin("admin");
  if (mutate) {
    const limit = await checkAdminMutationRateLimit(identifier(request, actor.email));
    if (!limit.allowed) throw new RateLimitError(limit.reason === "limited" ? 429 : 503);
  }
  return actor;
}

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    await authorize(request, false);
    const admins = await AdminAllowlist.find({})
      .sort({ email: 1 })
      .select({ email: 1, createdAt: 1 })
      .lean<Array<{ email: string; createdAt: Date }>>();
    return NextResponse.json({
      admins: admins.map((entry) => ({ email: entry.email, addedAt: entry.createdAt.toISOString() })),
    });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to list admins", error);
    return NextResponse.json({ error: "Unable to load admins." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const actor = await authorize(request, true);
    const parsed = mutationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    const email = normalizeEmail(parsed.data.email);

    if (getAdminEmails().includes(email)) {
      return NextResponse.json({ error: "This account is already an admin through the server configuration." }, { status: 409 });
    }
    if (!isAllowedDomain(email)) throw new InvalidRoleEmailError();

    const [existingAdmin, teamMember, teamLeader] = await Promise.all([
      AdminAllowlist.exists({ email }),
      TeamMember.exists({ email }),
      Team.exists({ leaderEmail: email }),
    ]);
    if (existingAdmin || teamMember || teamLeader) throw new RoleConflictError();

    await AdminAllowlist.create({ email, addedBy: actor.email });
    return NextResponse.json({ role: "admin", email }, { status: 201 });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof OriginError) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.status === 429 ? "Too many requests." : "User management is temporarily unavailable." }, { status: error.status });
    }
    if (error instanceof RoleConflictError || (error as { code?: number }).code === 11000) {
      return NextResponse.json({ error: "That account already belongs to a team or is already an admin." }, { status: 409 });
    }
    if (error instanceof InvalidRoleEmailError) return NextResponse.json({ error: "Admin accounts must use an allowed college email." }, { status: 400 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    console.error("Failed to grant admin access", error);
    return NextResponse.json({ error: "Unable to grant admin access." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await connectToDatabase();
    const actor = await authorize(request, true);
    const parsed = mutationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    const email = normalizeEmail(parsed.data.email);

    if (getAdminEmails().includes(email)) {
      return NextResponse.json({ error: "Admins listed in the server configuration cannot be changed here." }, { status: 409 });
    }
    if (normalizeEmail(actor.email) === email) {
      return NextResponse.json({ error: "You cannot revoke your own admin access." }, { status: 409 });
    }

    const record = await AdminAllowlist.findOneAndDelete({ email }).lean<{ _id: unknown } | null>();
    if (!record) throw new RoleNotFoundError();
    return NextResponse.json({ removed: true });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof OriginError) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.status === 429 ? "Too many requests." : "User management is temporarily unavailable." }, { status: error.status });
    }
    if (error instanceof RoleNotFoundError) return NextResponse.json({ error: "That admin was not found." }, { status: 404 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    console.error("Failed to revoke admin access", error);
    return NextResponse.json({ error: "Unable to revoke admin access." }, { status: 500 });
  }
}