import { NextResponse } from "next/server";
import { z } from "zod";
import { AdminAuthError, checkOrigin, requireAdmin } from "@/lib/admin-auth";
import { connectToDatabase } from "@/lib/db";
import { getSettings, type SettingsRecord } from "@/lib/settings";
import { isRollNumberValidForYear } from "@/lib/team-validation";
import { Setting } from "@/models/Setting";
import { TeamMember } from "@/models/TeamMember";

const settingsUpdateSchema = z
  .object({
    eventYear: z.number().int().min(2000).max(2100).optional(),
    registrationOpen: z.boolean().optional(),
    submissionsOpen: z.boolean().optional(),
    resultsPublished: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "At least one setting is required");

type SettingsUpdate = z.infer<typeof settingsUpdateSchema>;
type SettingsField = keyof SettingsUpdate;

class EventYearGuardrailError extends Error {}

function serializeSettings(settings: SettingsRecord) {
  return {
    eventYear: settings.eventYear,
    registrationOpen: settings.registrationOpen,
    submissionsOpen: settings.submissionsOpen,
    resultsPublished: settings.resultsPublished,
  };
}

async function validateEventYearChange(update: SettingsUpdate, currentEventYear: number) {
  const eventYear = update.eventYear;
  if (eventYear === undefined || eventYear === currentEventYear) return;

  const members = await TeamMember.find({})
    .select({ normalizedRollNumber: 1, year: 1 })
    .lean<Array<{ normalizedRollNumber: string; year: "UG1" | "UG2" | "UG3" | "UG4" }>>();
  if (members.some((member) => !isRollNumberValidForYear(member.normalizedRollNumber, member.year, eventYear))) {
    throw new EventYearGuardrailError();
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    await requireAdmin("admin");

    return NextResponse.json({ settings: serializeSettings(await getSettings()) });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Unable to read settings", error);
    return NextResponse.json({ error: "Unable to load settings." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!checkOrigin(request)) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  try {
    await connectToDatabase();
    await requireAdmin("admin");

    const parsed = settingsUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid settings update." }, { status: 400 });
    }
    const update = parsed.data;

    const current = await getSettings();
    if (!current) throw new Error("Settings could not be initialized");

    try {
      await validateEventYearChange(update, current.eventYear);
    } catch (error) {
      if (error instanceof EventYearGuardrailError) {
        return NextResponse.json(
          { error: "Event year cannot change because it would invalidate an existing member roll number." },
          { status: 400 },
        );
      }
      throw error;
    }

    const changed = (Object.keys(update) as SettingsField[]).some((key) => current[key] !== update[key]);
    if (!changed) {
      return NextResponse.json({ settings: serializeSettings(current) });
    }

    const updated = (await Setting.findOneAndUpdate(
      { singletonKey: current.singletonKey },
      { $set: update },
      { new: true, runValidators: true },
    ).lean()) as unknown as SettingsRecord | null;
    if (!updated) throw new Error("Settings could not be updated");

    return NextResponse.json({ settings: serializeSettings(updated) });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid settings update." }, { status: 400 });
    console.error("Unable to update settings", error);
    return NextResponse.json({ error: "Unable to update settings." }, { status: 500 });
  }
}