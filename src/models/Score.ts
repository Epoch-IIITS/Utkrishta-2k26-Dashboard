import { model, models, Schema, type InferSchemaType } from "mongoose";

const scoreSchema = new Schema(
  {
    teamId: { type: Schema.Types.ObjectId, ref: "Team", required: true, unique: true },
    technical: { type: Number, required: true, min: 0, max: 25 },
    innovation: { type: Number, required: true, min: 0, max: 20 },
    functionality: { type: Number, required: true, min: 0, max: 20 },
    impact: { type: Number, required: true, min: 0, max: 20 },
    presentation: { type: Number, required: true, min: 0, max: 15 },
  },
  { strict: "throw", timestamps: true },
);

export type ScoreDocument = InferSchemaType<typeof scoreSchema>;
if (models.Score && models.Score.schema.path("roundId")) delete models.Score;
export const Score = models.Score ?? model("Score", scoreSchema);
