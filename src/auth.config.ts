import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import type { AppRole } from "@/lib/roles";

const authConfig = {
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
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