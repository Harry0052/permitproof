import { ALLOWED_SOURCE_HOSTS } from "../domain/source-policy.js";
import type { EvidenceCard, Fact, Report } from "../domain/types.js";

export function renderText(report: Report): string {
  const lines = [
    "PermitProof checklist",
    "NOT AN APPROVAL",
    "",
    `Category: ${report.confirmation_category}`,
    `As of: ${report.as_of}`,
    `Registry: ${report.registry_id}`,
    `Documented change date: ${report.documented_change_date}`,
    `Selected rule: ${report.selected_rule_id ?? "(none)"}`,
    "",
    report.recovery,
    "",
    "Facts",
  ];
  for (const fact of report.facts) {
    lines.push(`- ${fact.id}: ${fact.state}. ${fact.text}`);
  }
  lines.push("", "Documented rule");
  pushCards(lines, report.groups.documented_rules);
  lines.push("", "Records to obtain");
  pushCards(lines, report.groups.records_to_obtain);
  lines.push("", "Questions to confirm");
  pushCards(lines, report.groups.questions_to_confirm);
  lines.push("", "Limitations");
  for (const item of report.limitations) {
    lines.push(`- ${item}`);
  }
  lines.push(
    "",
    `Input SHA-256: ${report.input_sha256}`,
    `Trace parcels: ${report.trace.parcels_file}`,
    `Trace rules: ${report.trace.rules_file}`,
    `Trace parcel id: ${report.trace.parcel_id ?? "(none)"}`,
    `Trace rule id: ${report.trace.rule_id ?? "(none)"}`,
  );
  return `${lines.join("\n")}\n`;
}

function pushCards(lines: string[], cards: EvidenceCard[]): void {
  if (cards.length === 0) {
    lines.push("- (none)");
    return;
  }
  for (const item of cards) {
    lines.push(`- ${item.title}`);
    lines.push(`  ${item.text}`);
    lines.push(
      `  source: ${item.source_url ?? "(none)"} | section: ${item.source_section ?? "(none)"} | effective date: ${item.effective_date ?? "(none)"} | retrieved: ${item.retrieval_date ?? "(none)"}`,
    );
  }
}

export function renderHtml(report: Report): string {
  const sections = [
    renderFactSection(report.facts),
    renderCardSection("Documented rule", report.groups.documented_rules),
    renderCardSection("Records to obtain", report.groups.records_to_obtain),
    renderCardSection("Questions to confirm", report.groups.questions_to_confirm),
    `<h2>Limitations</h2><ul>${report.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`,
  ];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PermitProof checklist (not an approval)</title>
  <style>
    body { font: 16px/1.45 Georgia, serif; color: #142013; background: #fff; margin: 1rem; max-width: 42rem; }
    a { color: #0b3a82; }
    h1 { font-size: 1.4rem; }
    h2 { font-size: 1.1rem; margin-top: 1.5rem; }
    .banner { border: 2px solid #142013; padding: 0.75rem; }
    .card { border-top: 1px solid #142013; padding: 0.75rem 0; }
    .meta { font-family: ui-monospace, monospace; font-size: 0.85rem; overflow-wrap: anywhere; }
    @media print { a { color: #000; text-decoration: none; } body { margin: 0; } }
  </style>
</head>
<body>
  <header class="banner">
    <h1>PermitProof checklist</h1>
    <p><strong>NOT AN APPROVAL.</strong> ${escapeHtml(report.limitations[0] ?? "")}</p>
    <p>Category: ${escapeHtml(report.confirmation_category)}<br>
    As of: ${escapeHtml(report.as_of)}<br>
    Selected rule: ${escapeHtml(report.selected_rule_id ?? "(none)")}</p>
    <p>${escapeHtml(report.recovery)}</p>
  </header>
  ${sections.join("\n")}
  <footer class="meta">
    <p>Input SHA-256: ${escapeHtml(report.input_sha256)}</p>
    <p>Trace: ${escapeHtml(report.trace.rules_file)} ${escapeHtml(report.trace.rule_id ?? "(none)")}</p>
  </footer>
</body>
</html>
`;
}

function renderFactSection(facts: Fact[]): string {
  const items = facts
    .map(
      (fact) =>
        `<li><strong>${escapeHtml(fact.id)}</strong> (${escapeHtml(fact.state)}): ${escapeHtml(fact.text)}</li>`,
    )
    .join("");
  return `<h2>Facts</h2><ul>${items}</ul>`;
}

function renderCardSection(title: string, cards: EvidenceCard[]): string {
  if (cards.length === 0) {
    return `<h2>${escapeHtml(title)}</h2><p>(none)</p>`;
  }
  const body = cards.map(renderCard).join("");
  return `<h2>${escapeHtml(title)}</h2>${body}`;
}

function renderCard(item: EvidenceCard): string {
  return `<article class="card">
    <h3>${escapeHtml(item.title)}</h3>
    <p>${escapeHtml(item.text)}</p>
    <p class="meta">Section: ${escapeHtml(item.source_section ?? "(none)")}<br>
    Effective date: ${escapeHtml(item.effective_date ?? "(none)")}<br>
    Retrieved: ${escapeHtml(item.retrieval_date ?? "(none)")}<br>
    Source: ${renderSource(item.source_url)}</p>
  </article>`;
}

function renderSource(url: string | null): string {
  if (url === null) {
    return "(none)";
  }
  if (!isLinkable(url)) {
    return escapeHtml(url);
  }
  const safe = escapeHtml(url);
  return `<a href="${safe}">${safe}</a>`;
}

function isLinkable(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ALLOWED_SOURCE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
