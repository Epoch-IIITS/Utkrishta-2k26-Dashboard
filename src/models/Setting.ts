import { model, models, Schema, type InferSchemaType } from "mongoose";

const settingSchema = new Schema(
  {
    singletonKey: { type: String, required: true, unique: true, immutable: true, default: "global" },
    eventYear: { type: Number, required: true, default: 2026 },
    TeamSize: { type: Number, required: true, default: 4 },
    registrationOpen: { type: Boolean, required: true, default: false },
    resultsPublished: { type: Boolean, required: true, default: false },
    submissionsOpen: { type: Boolean, required: true, default: false },
  },
  { strict: "throw", timestamps: true },
);

export type SettingDocument = InferSchemaType<typeof settingSchema>;

// During Next.js development, a previously loaded version of this model can
// remain cached after the schema changes. Replace only that incompatible cache.
if (models.Setting && (!models.Setting.schema.path("singletonKey") || !models.Setting.schema.path("eventYear") || models.Setting.schema.path("redemptionOpen"))) {
  delete models.Setting;
}

export const Setting = models.Setting ?? model("Setting", settingSchema);