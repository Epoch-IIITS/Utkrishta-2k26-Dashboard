"use client";
// Why "use client": holds form state, handles submit, adds/removes teammate rows, and navigates after success.

import { useRef, useState } from "react";
import { MAX_TEAM_SIZE, MIN_TEAM_SIZE } from "@/config/event";

type Year = "UG1" | "UG2" | "UG3" | "UG4";
type YearChoice = Year | "";
type Member = { name: string; email: string; rollNumber: string; year: YearChoice; branch: string };
type Leader = { name: string; phone: string; rollNumber: string; year: YearChoice; branch: string };

const YEARS: Year[] = ["UG1", "UG2", "UG3", "UG4"];
const INSTITUTION = "IIIT Sri City";
const TEAMMATES_MIN = MIN_TEAM_SIZE - 1;
const TEAMMATES_MAX = MAX_TEAM_SIZE - 1;

const emptyMember = (): Member => ({ name: "", email: "", rollNumber: "", year: "", branch: "" });

const inputClass =
  "rounded-xl border border-border bg-surface px-3 py-2 text-deep placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

function YearSelect({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: YearChoice;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <select
      aria-label={label}
      required
      className={`${inputClass} ${className}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Select year</option>
      {YEARS.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  );
}

// Turns any response (JSON or not) into a clear message for students.
function friendlyError(status: number, serverMessage?: string): string {
  if (serverMessage) return serverMessage;
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "The request was blocked. Refresh the page and try again.";
  if (status === 429) return "Too many attempts. Please wait a minute and try again.";
  if (status >= 500) return "Something went wrong on our side. Please try again, or contact the organizers.";
  return "Unable to register the team.";
}

export function TeamRegistrationForm({
  initialLeaderName,
  leaderEmail,
  registrationOpen = true,
}: {
  initialLeaderName: string;
  leaderEmail: string;
  registrationOpen?: boolean;
}) {
  const messageRef = useRef<HTMLParagraphElement>(null);
  const [teamName, setTeamName] = useState("");
  const [leader, setLeader] = useState<Leader>({
    name: initialLeaderName,
    phone: "",
    rollNumber: "",
    year: "",
    branch: "",
  });
  const [members, setMembers] = useState<Member[]>(() =>
    Array.from({ length: TEAMMATES_MIN }, emptyMember),
  );
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [previousHackathonExperience, setPreviousHackathonExperience] = useState<
    "none" | "1-2" | "3_or_more"
  >("none");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateMember(index: number, field: keyof Member, value: string) {
    setMembers((current) =>
      current.map((member, i) => (i === index ? { ...member, [field]: value } : member)),
    );
  }

  function updateLeader(field: keyof Leader, value: string) {
    setLeader((current) => ({ ...current, [field]: value }));
  }

  function addMember() {
    setMembers((current) => (current.length >= TEAMMATES_MAX ? current : [...current, emptyMember()]));
  }

  function removeMember(index: number) {
    setMembers((current) =>
      current.length <= TEAMMATES_MIN ? current : current.filter((_, i) => i !== index),
    );
  }

  function showError(text: string) {
    setMessage({ type: "error", text });
    // Bring the message into view so students never miss it on a phone.
    setTimeout(() => messageRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    if (!registrationOpen) {
      showError("Registration is currently closed.");
      return;
    }
    setSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        teamName: teamName.trim(),
        institutionName: INSTITUTION,
        leader: {
          ...leader,
          name: leader.name.trim(),
          // Server only accepts digits with an optional leading +
          phone: leader.phone.replace(/[\s()-]/g, ""),
          rollNumber: leader.rollNumber.trim(),
          branch: leader.branch.trim(),
        },
        members: members.map((member) => ({
          ...member,
          name: member.name.trim(),
          email: member.email.trim().toLowerCase(),
          rollNumber: member.rollNumber.trim(),
          branch: member.branch.trim(),
        })),
        rulesAccepted,
        previousHackathonExperience,
        ...(githubUrl.trim() ? { githubUrl: githubUrl.trim() } : {}),
        ...(linkedinUrl.trim() ? { linkedinUrl: linkedinUrl.trim() } : {}),
      };

      const response = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // The server may answer with a non-JSON error page; never let that crash the form.
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        showError(friendlyError(response.status, data.error));
        setSubmitting(false);
        return;
      }

      setMessage({ type: "success", text: "Your team has been registered. Redirecting…" });
      // Full navigation so the top nav re-reads hasTeam and shows "My Team".
      window.location.assign("/team");
    } catch {
      showError("Network problem. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      className="mt-8 space-y-6 rounded-2xl border border-border bg-surface p-5 shadow-card"
      onSubmit={submit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-deep">
          Team name
          <input
            className={`mt-1.5 block w-full ${inputClass}`}
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            required
            minLength={3}
            maxLength={40}
          />
        </label>
        <label className="block text-sm font-medium text-deep">
          Institution
          <input
            aria-label="Institution"
            className={`mt-1.5 block w-full cursor-not-allowed bg-tint text-muted ${inputClass}`}
            value={INSTITUTION}
            readOnly
          />
        </label>
      </div>

      <p className="rounded-xl bg-tint px-3 py-2 text-sm text-deep">
        Neural Forge is a team event. Each team must have {MIN_TEAM_SIZE} or {MAX_TEAM_SIZE} members: you
        and {TEAMMATES_MIN} or {TEAMMATES_MAX} teammates. Choose each person&apos;s correct year of study.
        Roll numbers must match the year.
      </p>

      <fieldset className="grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-deep">Your details (team leader)</legend>
        <label className="text-sm font-medium text-deep sm:col-span-2">
          Verified Google email
          <input
            aria-label="Verified leader email"
            className={`mt-1 block w-full cursor-not-allowed bg-tint text-muted ${inputClass}`}
            value={leaderEmail}
            readOnly
          />
        </label>
        <input aria-label="Your name" className={inputClass} placeholder="Full name" value={leader.name} onChange={(e) => updateLeader("name", e.target.value)} required />
        <input aria-label="WhatsApp number" className={inputClass} placeholder="WhatsApp number (10-15 digits)" inputMode="tel" value={leader.phone} onChange={(e) => updateLeader("phone", e.target.value)} required />
        <input aria-label="Your roll number" className={inputClass} placeholder="Roll number (e.g. S20250010001)" value={leader.rollNumber} onChange={(e) => updateLeader("rollNumber", e.target.value)} required />
        <YearSelect label="Your year" value={leader.year} onChange={(value) => updateLeader("year", value)} />
        <input aria-label="Your branch" className={`${inputClass} sm:col-span-2`} placeholder="Branch (e.g. CSE)" value={leader.branch} onChange={(e) => updateLeader("branch", e.target.value)} required />
      </fieldset>

      <fieldset className="space-y-3 border-t border-border pt-5">
        <legend className="text-sm font-semibold text-deep">
          Teammates ({TEAMMATES_MIN} required{TEAMMATES_MAX > TEAMMATES_MIN ? `, up to ${TEAMMATES_MAX}` : ""})
        </legend>
        {members.map((member, index) => (
          <div className="grid gap-3 rounded-xl bg-tint p-3 sm:grid-cols-2" key={index}>
            <div className="flex items-center justify-between sm:col-span-2">
              <p className="text-sm font-semibold text-deep">
                Member {index + 2}
                {index >= TEAMMATES_MIN ? " (optional)" : ""}
              </p>
              {index >= TEAMMATES_MIN && (
                <button
                  type="button"
                  onClick={() => removeMember(index)}
                  className="text-sm font-semibold text-error underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40"
                >
                  Remove
                </button>
              )}
            </div>
            <input aria-label={`Member ${index + 2} name`} className={inputClass} placeholder="Full name" value={member.name} onChange={(e) => updateMember(index, "name", e.target.value)} required />
            <input aria-label={`Member ${index + 2} email`} className={inputClass} placeholder="name@iiits.in" type="email" value={member.email} onChange={(e) => updateMember(index, "email", e.target.value)} required />
            <input aria-label={`Member ${index + 2} roll number`} className={inputClass} placeholder="Roll number" value={member.rollNumber} onChange={(e) => updateMember(index, "rollNumber", e.target.value)} required />
            <YearSelect label={`Member ${index + 2} year`} value={member.year} onChange={(value) => updateMember(index, "year", value)} />
            <input aria-label={`Member ${index + 2} branch`} className={`${inputClass} sm:col-span-2`} placeholder="Branch" value={member.branch} onChange={(e) => updateMember(index, "branch", e.target.value)} required />
          </div>
        ))}

        {members.length < TEAMMATES_MAX && (
          <button
            type="button"
            onClick={addMember}
            className="w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            + Add another teammate (team of {MAX_TEAM_SIZE})
          </button>
        )}
      </fieldset>

      <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
        <label className="text-sm font-medium text-deep">
          Previous hackathon experience (optional)
          <select
            className={`mt-1.5 block w-full ${inputClass}`}
            value={previousHackathonExperience}
            onChange={(e) => setPreviousHackathonExperience(e.target.value as "none" | "1-2" | "3_or_more")}
          >
            <option value="none">None</option>
            <option value="1-2">1–2</option>
            <option value="3_or_more">3 or more</option>
          </select>
        </label>
        <div className="space-y-3">
          <input aria-label="GitHub URL (optional)" type="url" className={`block w-full ${inputClass}`} placeholder="GitHub URL (optional, https)" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} />
          <input aria-label="LinkedIn URL (optional)" type="url" className={`block w-full ${inputClass}`} placeholder="LinkedIn URL (optional, https)" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
        </div>
      </div>

      <label className="flex gap-2 text-sm text-deep">
        <input type="checkbox" checked={rulesAccepted} onChange={(e) => setRulesAccepted(e.target.checked)} required />
        I confirm that my team accepts the event rules.
      </label>

      {message && (
        <p
          ref={messageRef}
          role={message.type === "error" ? "alert" : "status"}
          aria-live="polite"
          className={
            message.type === "error"
              ? "rounded-xl border border-error/30 bg-error/10 px-3 py-2 text-sm font-medium text-error"
              : "rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-success"
          }
        >
          {message.text}
        </p>
      )}

      <button
        className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        disabled={submitting || !registrationOpen}
        type="submit"
      >
        {!registrationOpen ? "Registration closed" : submitting ? "Registering…" : "Register team"}
      </button>
    </form>
  );
}