import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import type { AppRole } from "@/lib/roles";

const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;

const authConfig = {
  providers: [
    Google({
      authorization: {
        params: {
          // Always show Google's account chooser so a wrong account is not reused silently.
          prompt: "select_account",
          // Hint only: shows college accounts first. The real check is in the sign-in callback.
          ...(allowedDomain ? { hd: allowedDomain } : {}),
        },
      },
    }),
  ],
  // Needed on Vercel for both auth.ts and middleware.ts, which each create their own NextAuth instance.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/", error: "/auth-error" },
  callbacks: {
    session({ session, token }) {
      if (session.user && typeof token.email === "string") {
        session.user.email = token.email;
        session.user.role = typeof token.role === "string" ? (token.role as AppRole) : "student";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export default authConfig;