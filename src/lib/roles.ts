import { connectToDatabase } from "@/lib/db";
import { AdminAllowlist } from "@/models/AdminAllowlist";
import { Team } from "@/models/Team";

export type AppRole = "admin" | "team_leader" | "student";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isAllowedDomain(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const separator = normalizedEmail.lastIndexOf("@");
  const domain = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();
  return Boolean(domain && separator > 0 && normalizedEmail.slice(separator + 1) === domain);
}

// Admins listed in the ADMIN_EMAILS environment variable. They always have admin access,
// so the site can never be locked out even if the allowlist is empty.
export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map(normalizeEmail).filter(Boolean);
}

export async function getRoleForEmail(email: string): Promise<AppRole> {
  const normalizedEmail = normalizeEmail(email);
  if (getAdminEmails().includes(normalizedEmail)) return "admin";
  await connectToDatabase();

  const [admin, leader] = await Promise.all([
    AdminAllowlist.exists({ email: normalizedEmail }),
    Team.exists({ leaderEmail: normalizedEmail }),
  ]);

  // An email that is both an admin and a team leader fails closed instead of getting either role.
  if (admin && leader) return "student";
  if (admin) return "admin";
  if (leader) return "team_leader";
  return "student";
}