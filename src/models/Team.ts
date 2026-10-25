import { model, models, Schema, type InferSchemaType } from "mongoose";

const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, unique: true, trim: true, lowercase: true },
    leaderEmail: { type: String, required: true, unique: true, trim: true, lowercase: true },
    institutionName: { type: String, required: true, trim: true },
    previousHackathonExperience: { type: String, enum: ["none", "1-2", "3_or_more"], default: null },
    githubUrl: { type: String, default: null, trim: true },
    linkedinUrl: { type: String, default: null, trim: true },
    rulesAcceptedAt: { type: Date, required: true },
    assignedPsId: { type: Schema.Types.ObjectId, ref: "ProblemStatement", default: null },
    liveUrl: { type: String, default: null, trim: true },
    repoUrl: { type: String, default: null, trim: true },
  },
  { strict: "throw", timestamps: true },
);

export type TeamDocument = InferSchemaType<typeof teamSchema>;
export const Team = models.Team ?? model("Team", teamSchema);
