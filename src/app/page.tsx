import Link from "next/link";
import { auth, signIn } from "@/auth";
import { contact, eventDate, eventDescription, eventName, eventVenue, prizePool, prizeSplit, socials } from "@/config/site";
import { MAX_TEAM_SIZE, MIN_TEAM_SIZE, neuralForgeTimeline } from "@/config/event";
import { Reveal } from "@/components/effects/reveal";
import { CalendarIcon, CodeIcon, GitHubIcon, InstagramIcon, LinkedInIcon, ShieldIcon, SparkleIcon, TrophyIcon, UsersIcon } from "@/components/ui/icons";

const socialIcons = { Instagram: InstagramIcon, LinkedIn: LinkedInIcon, GitHub: GitHubIcon };
const timelineIcons = { reveal: CalendarIcon, prototype: CodeIcon, showdown: TrophyIcon };
const facts = [{ label: "72 Hours", Icon: CalendarIcon }, { label: "Teams of 3-4", Icon: UsersIcon }, { label: "In-person judging", Icon: ShieldIcon }, { label: "AI/ML", Icon: SparkleIcon }] as const;
function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) { return <div className="mb-10 text-center"><h2 className="text-3xl font-bold text-deep">{title}</h2><div className="mx-auto mt-3 h-1 w-12 rounded-full bg-primary" /><p className="mx-auto mt-4 max-w-xl text-muted">{subtitle}</p></div>; }

const primaryBtn =
  "rounded bg-primary px-5 py-3 font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2";

export default async function HomePage() {
  const session = await auth();
  const activeSocials = socials.filter((social) => Boolean(social.href));
  const dateVenue = [eventDate, eventVenue].filter(Boolean).join(" · ") || "Date and venue: TBD";
  return <main className="min-h-screen overflow-x-hidden">
    <section className="relative px-4 pb-16 pt-20 text-center sm:px-6 sm:pt-28"><span aria-hidden="true" className="hero-particle left-[12%] top-24" /><span aria-hidden="true" className="hero-particle hero-particle-delay right-[14%] top-36" /><span aria-hidden="true" className="hero-particle hero-particle-slow left-[22%] top-72" /><div className="relative mx-auto max-w-5xl"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">EPOCH · IIIT Sri City · Utkrishta 2026</p><h1 className="hero-title mt-4 text-5xl font-bold sm:text-7xl">{eventName}</h1><p className="mx-auto mt-5 max-w-2xl text-lg text-muted">{eventDescription}</p><p className="mt-5 text-2xl font-semibold text-primary">Prize pool: {prizePool}</p><div className="mt-5 flex flex-wrap justify-center gap-2">{facts.map(({ label, Icon }) => <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-3 py-1.5 text-sm font-medium text-deep shadow-glow-sm" key={label}><Icon className="size-4 text-primary" />{label}</span>)}</div>
      <div className="relative z-10 mt-9 flex flex-wrap justify-center gap-4">
        {session?.user ? (
          <Link className={primaryBtn} href="/team">
            My team
          </Link>
        ) : (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/register-team" });
            }}
          >
            <button type="submit" className={primaryBtn}>
              Register your team
            </button>
          </form>
        )}
        <Link
          className="rounded border border-primary px-5 py-3 font-semibold text-primary transition hover:-translate-y-0.5 hover:bg-tint hover:shadow-glow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          href="/rules"
        >
          Read the rules
        </Link>
      </div>
      <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 divide-x divide-border rounded-xl border border-border bg-surface/80 text-sm shadow-card sm:grid-cols-4"><p className="p-3 font-semibold text-deep">72 Hours</p><p className="p-3 font-semibold text-deep">{MIN_TEAM_SIZE}–{MAX_TEAM_SIZE} members per team</p><p className="p-3 font-semibold text-deep">3 days</p><p className="p-3 font-semibold text-deep">{prizePool} prize pool</p></div></div></section>
    <section className="px-4 py-16 sm:px-6"><div className="mx-auto max-w-6xl"><SectionTitle title="How Neural Forge Runs" subtitle="72 hours. 3 days. One deployed project." /><Reveal stagger={0.25} className="relative space-y-7 before:absolute before:bottom-4 before:left-4 before:top-4 before:w-px before:bg-border md:before:left-1/2">{neuralForgeTimeline.map((item, index) => { const Icon = timelineIcons[item.icon]; const side = index % 2 ? "md:col-start-2" : "md:text-right"; return <article className={"relative pl-11 md:grid md:grid-cols-2 md:gap-12 md:pl-0 " + side} key={item.day}><span className="absolute left-0 top-6 z-10 flex size-9 items-center justify-center rounded-full border-4 border-surface bg-primary text-white md:left-1/2 md:-translate-x-1/2"><Icon className="size-4" /></span><div className={"rounded-2xl border border-border bg-surface p-5 shadow-card transition hover:-translate-y-1 hover:shadow-glow-sm " + (index % 2 ? "md:col-start-2" : "")}><p className="inline-flex rounded-full bg-tint px-2.5 py-1 text-xs font-bold text-primary">{item.day}</p><h3 className="mt-3 text-lg font-bold text-deep">{item.title}</h3><ul className="mt-3 list-disc space-y-2 pl-5 text-left text-sm leading-6 text-muted">{item.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul></div></article>; })}</Reveal><p className="mx-auto mt-8 w-fit rounded-full border border-border bg-tint px-4 py-2 text-sm font-medium text-muted">{dateVenue}</p></div></section>
    <section className="bg-tint/60 px-4 py-16 sm:px-6"><div className="mx-auto max-w-6xl"><SectionTitle title="Prize pool" subtitle="A celebration of ambitious ideas, thoughtful building, and strong execution." /><div className="prize-card relative overflow-hidden rounded-2xl border border-border bg-surface p-8 text-center shadow-glow"><TrophyIcon className="mx-auto size-10 text-primary" /><p className="mt-4 text-sm font-bold uppercase tracking-[0.2em] text-muted">Total Prize Pool</p><p className="prize-amount mt-2 text-5xl font-bold sm:text-7xl">{prizePool}</p></div><div className="mt-6 grid gap-4 sm:grid-cols-3">{([["1st", prizeSplit.first], ["2nd", prizeSplit.second], ["3rd", prizeSplit.third]] as const).map(([place, amount]) => <article className="rounded-xl border border-border bg-surface p-5 text-center shadow-card transition hover:-translate-y-1 hover:shadow-glow-sm" key={place}><TrophyIcon className="mx-auto size-6 text-primary" /><h3 className="mt-2 font-bold text-deep">{place} place</h3><p className="mt-1 text-sm text-muted">{amount || "To be announced"}</p></article>)}</div>
    </div></section>
    <section id="contact" className="px-4 py-16 sm:px-6"><div className="mx-auto flex max-w-6xl flex-col gap-12 md:flex-row md:items-start md:justify-between"><section className="rounded-2xl border border-border bg-tint/60 p-6 text-left shadow-card"><h2 className="text-2xl font-bold text-deep">Contact</h2><div className="mt-3 h-1 w-12 rounded-full bg-primary" /><p className="mt-5 text-muted">For any queries, reach out to us</p><p className="mt-3 font-semibold text-deep">{contact.name}</p><p className="text-sm text-muted">{contact.role}</p><a className="mt-2 inline-block font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href={"mailto:" + contact.email}>{contact.email}</a><p className="mt-3 text-sm text-muted">{contact.organization}</p></section><section className="rounded-2xl border border-border bg-tint/60 p-6 text-left shadow-card md:items-end md:text-right"><h2 className="text-2xl font-bold text-deep">Follow us</h2><div className="mt-3 h-1 w-12 rounded-full bg-primary md:ml-auto" />{activeSocials.length ? <div className="mt-5 flex gap-3 md:justify-end">{activeSocials.map((social) => { const Icon = socialIcons[social.label]; return <a aria-label={"EPOCH on " + social.label} className="flex size-12 items-center justify-center rounded-xl border border-border bg-surface text-primary shadow-card transition hover:-translate-y-1 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href={social.href ?? undefined} key={social.label} rel="noopener noreferrer" target="_blank"><Icon className="size-5" /></a>; })}</div> : <p className="mt-5 text-sm text-muted">Links coming soon.</p>}</section></div></section><footer className="border-t border-border px-4 py-6 text-center text-sm text-muted">Neural Forge · Utkrishta 2026 · EPOCH, AI/ML Club, IIIT Sri City</footer>
  </main>;
}