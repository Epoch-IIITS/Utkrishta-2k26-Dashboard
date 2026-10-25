import Link from "next/link";
import { signInWithGoogle } from "@/app/actions";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const domain = process.env.ALLOWED_EMAIL_DOMAIN ?? "iiits.in";
  const denied = error === "AccessDenied";

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg items-center px-4 py-16">
      <section className="w-full rounded-2xl border border-border bg-surface p-8 text-center shadow-card">
        <h1 className="text-2xl font-bold text-deep">
          {denied ? "Access denied" : "Sign-in problem"}
        </h1>
        <p className="mt-3 text-muted">
          {denied
            ? `Please sign in with your IIIT Sri City account (@${domain}).`
            : "Something went wrong while signing in. Please try again with your IIIT Sri City account."}
        </p>

        <form action={signInWithGoogle} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Sign in with IIIT account
          </button>
        </form>

        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4"
        >
          Back to home
        </Link>
      </section>
    </main>
  );
}