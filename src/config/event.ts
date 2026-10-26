// Team size is the leader plus teammates. Change it here only; every other file imports it.
export const MIN_TEAM_SIZE = 3;
export const MAX_TEAM_SIZE = 4;

export type TimelineDay = {
  day: "Day 1" | "Day 2" | "Day 3";
  title: string;
  bullets: readonly string[];
  icon: "reveal" | "prototype" | "showdown";
};

export const neuralForgeTimeline: readonly TimelineDay[] = [
  {
    day: "Day 1",
    title: "Problem Statement Reveal & Sprint Kickoff",
    icon: "reveal",
    bullets: [
      "Organizers release all official problem statements with detailed criteria and dataset links.",
      "Teams select a problem statement.",
      "Teams start architecture design, repository setup and development.",
    ],
  },
  {
    day: "Day 2",
    title: "Mid-Hackathon Checkpoint & Prototyping",
    icon: "prototype",
    bullets: [
      "Mandatory progress review with an assigned technical mentor.",
      "Intensive prototyping and model training.",
    ],
  },
  {
    day: "Day 3",
    title: "Final Submission, Physical Evaluation & Showdown",
    icon: "showdown",
    bullets: [
      "Teams submit a fully deployed, live online web app or AI endpoint; local-only projects are incomplete.",
      "Live demonstration and technical defense in person before industry and academic guest judges.",
      "Winners are announced at the closing ceremony.",
    ],
  },
];