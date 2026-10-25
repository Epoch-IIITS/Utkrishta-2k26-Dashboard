import { model, models, Schema, type InferSchemaType } from "mongoose";

const problemStatementSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    revealed: { type: Boolean, required: true, default: false },
  },
  { strict: "throw", timestamps: true },
);

export type ProblemStatementDocument = InferSchemaType<typeof problemStatementSchema>;
export const ProblemStatement = models.ProblemStatement ?? model("ProblemStatement", problemStatementSchema);
