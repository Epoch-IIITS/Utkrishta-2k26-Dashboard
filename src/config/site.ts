/** Public club details. Fill the TODO values only with confirmed information. */
function httpsUrl(value: string | null): string | null {
  if (value && !value.startsWith("https://")) {
    throw new Error("Public site links must use https://");
  }
  return value;
}

export const clubName = "Epoch AIML Club";
export const eventName = "Neural Forge";
export const eventDescription = "A 72-hour AI/ML hackathon by EPOCH at IIIT Sri City.";
export const prizePool = "₹12,000";
// TODO: Set confirmed prize amounts before displaying them.
export const prizeSplit = { first: null, second: null, third: null } as const;
export const email: string | null = null; // TODO: add the club email.
export const locationText: string | null = null; // TODO: add the confirmed location.
export const websiteUrl = httpsUrl(null); // TODO: add the confirmed club website.
export const socials = [
  { label: "Instagram", href: httpsUrl(null) }, // TODO: add the confirmed Instagram URL.
  { label: "LinkedIn", href: httpsUrl(null) }, // TODO: add the confirmed LinkedIn URL.
  { label: "GitHub", href: httpsUrl(null) }, // TODO: add the confirmed GitHub URL.
] as const;
