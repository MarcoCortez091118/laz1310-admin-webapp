import type { AccountParticipation } from "../../dynamics/participantTypes";

export interface RegistrationPage {
  items: AccountParticipation[];
  nextCursor: string | null;
}

export type FetchRegistrationPage = (
  campaignId: string, limit: number, after?: string,
) => Promise<RegistrationPage>;

/** Fail closed if existing audited FastAPI read limits prevent a complete export. */
export async function collectCampaignRegistrations(
  campaignId: string,
  fetchPage: FetchRegistrationPage,
): Promise<AccountParticipation[]> {
  const result: AccountParticipation[] = [];
  const seen = new Set<string>();
  let after: string | undefined;
  for (let index = 0; index < 5; index += 1) {
    const page = await fetchPage(campaignId, 100, after);
    result.push(...page.items);
    if (!page.nextCursor) return result;
    if (page.nextCursor === after || seen.has(page.nextCursor)) {
      throw new Error("Cursor de registros repetido: exportación cancelada.");
    }
    seen.add(page.nextCursor);
    after = page.nextCursor;
  }
  throw new Error(
    "La campaña supera el límite seguro de esta descarga (500 registros). " +
    "La exportación está cancelada, sin archivo parcial. Requiere exportación auditada del servidor.",
  );
}

export function csvSafe(value: unknown): string {
  const text = String(value ?? "");
  const escaped = /^[=+\-@]/.test(text.trimStart()) ? "'" + text : text;
  return '"' + escaped.replaceAll('"', '""') + '"';
}

export function campaignRegistrationsCsv(items: AccountParticipation[]): string {
  const dynamicFieldKeys = [...new Set(items.flatMap(row => Object.keys(row.values ?? {})))].sort();
  const headings = [
    "id", "dynamicId", "submittedAt", "releaseId", "acceptedReleaseId",
    "authenticated", "accountUserId", "displayName", "email",
    "emailVerified", "consentVersion", ...dynamicFieldKeys,
  ];
  const rows = items.map(row => [
    row.id, row.dynamicId, row.submittedAt, row.releaseId, row.acceptedReleaseId,
    row.authenticated, row.account?.userId ?? "", row.account?.displayName ?? "",
    row.account?.email ?? "", row.account?.emailVerified ?? "",
    row.consent?.version ?? "", ...dynamicFieldKeys.map(key => row.values?.[key] ?? ""),
  ]);
  return [headings, ...rows].map(line => line.map(csvSafe).join(",")).join("\r\n");
}

export function campaignCsvFilename(slug: string): string {
  const safe = slug.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, 80);
  return "laz1310-premios-" + (safe || "registros") + "-retained.csv";
}
