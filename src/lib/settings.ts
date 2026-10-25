import { Setting } from "@/models/Setting";
import { connectToDatabase } from "@/lib/db";

export const SETTINGS_SINGLETON_KEY = "global";

export type SettingsRecord = {
  _id: unknown;
  singletonKey: string;
  eventYear: number;
  registrationOpen: boolean;
  resultsPublished: boolean;
  submissionsOpen: boolean;
};

export async function getSettings() {
  await connectToDatabase();
  const settings = await Setting.findOneAndUpdate(
    { singletonKey: SETTINGS_SINGLETON_KEY },
    { $setOnInsert: { singletonKey: SETTINGS_SINGLETON_KEY } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();
  return settings as unknown as SettingsRecord;
}
