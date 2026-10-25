export const rollNumberPattern = /^S[0-9]{11}$/;

export function normalizeRollNumber(value: string) {
  return value.trim().toUpperCase();
}

export function isRollNumberValidForYear(rollNumber: string, year: "UG1" | "UG2" | "UG3" | "UG4", eventYear: number) {
  const normalized = normalizeRollNumber(rollNumber);
  if (!rollNumberPattern.test(normalized)) return false;

  const admissionYear = Number(normalized.slice(1, 5));
  const ugYear = Number(year.slice(2));
  return admissionYear === eventYear - (ugYear - 1);
}