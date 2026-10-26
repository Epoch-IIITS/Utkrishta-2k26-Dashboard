import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { AdminAuthError, checkOrigin, isValidObjectId, requireAdmin } from "@/lib/admin-auth";
import { checkAdminMutationRateLimit, checkTeamRegistrationRateLimit } from "@/lib/rate-limit";
import { getAdminEmails, isAllowedDomain, normalizeEmail } from "@/lib/roles";
import { isRollNumberValidForYear, normalizeRollNumber, rollNumberPattern } from "@/lib/team-validation";
import { AdminAllowlist } from "@/models/AdminAllowlist";
import { Setting } from "@/models/Setting";
import { Team } from "@/models/Team";
import { TeamMember } from "@/models/TeamMember";
import { MAX_TEAM_SIZE, MIN_TEAM_SIZE } from "@/config/event";

const personName = z.string().trim().min(2).max(60).regex(/^[A-Za-z .'-]+$/);
const rollNumber = z.string().trim().transform(normalizeRollNumber).refine((value) => rollNumberPattern.test(value));
const year = z.enum(["UG1", "UG2", "UG3", "UG4"]);
const branch = z.string().trim().min(1).max(100).regex(/^[A-Za-z .&()'-]+$/);
const requestSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("add"),
      member: z.object({ name: personName, email: z.string().trim().email().max(254), rollNumber, year, branch }).strict(),
      confirmSizeException: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("remove"),
      memberEmail: z.string().trim().email().max(254),
      confirmSizeException: z.boolean().optional(),
    })
    .strict(),
]);

type Params = { params: Promise<{ teamId: string }> };
type TeamForMembers = { _id: mongoose.Types.ObjectId; name: string; leaderEmail: string };
type Member = { _id: mongoose.Types.ObjectId; name: string; email: string; normalizedRollNumber: string; year: "UG1" | "UG2" | "UG3" | "UG4" };
type Settings = { eventYear: number };

class TeamNotFoundError extends Error {}
class SettingsNotFoundError extends Error {}
class MemberNotFoundError extends Error {}
class MemberAlreadyInTeamError extends Error {}
class IneligibleMemberError extends Error {}
class CannotRemoveLeaderError extends Error {}
class SizeConfirmationError extends Error {}
class RollNumberYearError extends Error {}

function identifier(request: Request, email: string) {
  return `${email}:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"}`;
}

function isInvalidCollegeEmail(email: string) {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.lastIndexOf("@");
  return !isAllowedDomain(normalized) || atIndex <= 0 || normalized.slice(0, atIndex).includes("+");
}

export async function PATCH(request: Request, { params }: Params) {
  if (!checkOrigin(request)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  const { teamId } = await params;
  if (!isValidObjectId(teamId)) return NextResponse.json({ error: "Invalid team ID." }, { status: 400 });

  try {
    await connectToDatabase();
    const actor = await requireAdmin("admin");
    const [adminLimit, editLimit] = await Promise.all([
      checkAdminMutationRateLimit(identifier(request, actor.email)),
      checkTeamRegistrationRateLimit(identifier(request, actor.email)),
    ]);
    if (!adminLimit.allowed || !editLimit.allowed) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid member change." }, { status: 400 });
    const data = parsed.data;
    const memberEmail = data.action === "add" ? normalizeEmail(data.member.email) : normalizeEmail(data.memberEmail);
    if (isInvalidCollegeEmail(memberEmail)) {
      return NextResponse.json({ error: "Members must use an eligible college email address without a plus alias." }, { status: 400 });
    }

    const dbSession = await mongoose.startSession();
    try {
      let result: { member: { name: string; email: string; rollNumber: string; year: string; branch: string } | null; sizeException: boolean } | null = null;
      await dbSession.withTransaction(async () => {
        const [team, settings, members] = await Promise.all([
          Team.findById(teamId).session(dbSession).lean<TeamForMembers>(),
          Setting.findOne({ singletonKey: "global" }).session(dbSession).lean<Settings>(),
          TeamMember.find({ teamId }).sort({ _id: 1 }).session(dbSession).lean<Member[]>(),
        ]);
        if (!team) throw new TeamNotFoundError();
        if (!settings) throw new SettingsNotFoundError();

        // A Neural Forge team has exactly 4 members. Any other size needs the admin's confirmation.
                // A Neural Forge team has 3 or 4 members. Any other size needs the admin's confirmation.
        const resultingSize = members.length + (data.action === "add" ? 1 : -1);
        const sizeException = resultingSize < MIN_TEAM_SIZE || resultingSize > MAX_TEAM_SIZE;
        if (sizeException && !data.confirmSizeException) throw new SizeConfirmationError();

        if (data.action === "add") {
          if (!isRollNumberValidForYear(data.member.rollNumber, data.member.year, settings.eventYear)) throw new RollNumberYearError();
          if (members.some((member) => member.email === memberEmail)) throw new MemberAlreadyInTeamError();

          const normalizedRollNumber = normalizeRollNumber(data.member.rollNumber);
          const [otherMember, otherRollNumber, admin] = await Promise.all([
            TeamMember.exists({ email: memberEmail }).session(dbSession),
            TeamMember.exists({ normalizedRollNumber }).session(dbSession),
            AdminAllowlist.exists({ email: memberEmail }).session(dbSession),
          ]);
          if (otherMember || otherRollNumber) throw new MemberAlreadyInTeamError();
          if (admin || getAdminEmails().includes(memberEmail)) throw new IneligibleMemberError();

          const [created] = await TeamMember.create(
            [
              {
                teamId: team._id,
                name: data.member.name,
                email: memberEmail,
                normalizedEmail: memberEmail,
                rollNumber: data.member.rollNumber,
                normalizedRollNumber,
                year: data.member.year,
                branch: data.member.branch,
              },
            ],
            { session: dbSession },
          );
          result = {
            member: { name: created.name, email: created.email, rollNumber: created.rollNumber, year: created.year, branch: created.branch },
            sizeException,
          };
          return;
        }

        if (team.leaderEmail === memberEmail) throw new CannotRemoveLeaderError();
        const member = members.find((entry) => entry.email === memberEmail);
        if (!member) throw new MemberNotFoundError();
        const removed = await TeamMember.findOneAndDelete({ _id: member._id, teamId: team._id }, { session: dbSession }).lean<Member>();
        if (!removed) throw new MemberNotFoundError();
        result = { member: null, sizeException };
      });
      if (!result) throw new Error("No member result");
      return NextResponse.json(result);
    } finally {
      await dbSession.endSession();
    }
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof TeamNotFoundError) return NextResponse.json({ error: "Team not found." }, { status: 404 });
    if (error instanceof MemberNotFoundError) return NextResponse.json({ error: "Member not found on this team." }, { status: 404 });
    if (error instanceof MemberAlreadyInTeamError) return NextResponse.json({ error: "A member is already in a team." }, { status: 409 });
    if (error instanceof IneligibleMemberError) return NextResponse.json({ error: "That email is not eligible to join a team." }, { status: 400 });
    if (error instanceof RollNumberYearError) return NextResponse.json({ error: "The roll number must match the member's UG year." }, { status: 400 });
    if (error instanceof CannotRemoveLeaderError) return NextResponse.json({ error: "Transfer leadership before removing the current leader." }, { status: 409 });
    if (error instanceof SizeConfirmationError) return NextResponse.json({ error: "This change needs confirmation because it creates a one-team size exception." }, { status: 409 });
    if (error instanceof SettingsNotFoundError) return NextResponse.json({ error: "Settings not found." }, { status: 500 });
    if ((error as { code?: number }).code === 11000) return NextResponse.json({ error: "A member is already in a team." }, { status: 409 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid member change." }, { status: 400 });
    console.error("Failed to update team members", error);
    return NextResponse.json({ error: "Unable to update team members." }, { status: 500 });
  }
}