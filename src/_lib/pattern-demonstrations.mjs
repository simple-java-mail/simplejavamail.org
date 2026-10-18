import { z } from "zod";

// Curated demonstrations, not every API mentioned in an example. Scenario names refer to executable workbench checks.
const topic = z.object({ id: z.string().min(1), title: z.string().min(1), reference: z.string().regex(/^\/[a-z0-9-/]+\.html(?:#[a-z0-9-]+)?$/),
  demonstrations: z.array(z.object({ pattern: z.string().regex(/^[a-z-]+$/), section: z.string().regex(/^[a-z0-9-]+$/),
    label: z.string().min(1), scenario: z.string().min(1) })).min(1) });

export const patternDemonstrations = z.array(topic).parse([
  { id: "tenant-routing", title: "Independent customer Mailers", reference: "/smtp-connection-pooling.html", demonstrations: [
    { pattern: "relaydesk", section: "tenant-isolation", label: "Keep customer mail routes separate", scenario: "relaydesk" },
  ] },
  { id: "sending-limits", title: "Sending limits and shared admission", reference: "/sending-and-execution.html#section-sending-limits", demonstrations: [
    { pattern: "polar-meridian", section: "shared-sending-limits", label: "Coordinate two dispatcher instances", scenario: "polar-meridian" },
    { pattern: "relaydesk", section: "fair-turns-and-route-replacement", label: "Give customers independent turns", scenario: "relaydesk" },
  ] },
  { id: "connection-failover", title: "Connection failover", reference: "/smtp-connection-failover.html", demonstrations: [
    { pattern: "polar-meridian", section: "failover-and-recovery", label: "Take a relay offline and recover", scenario: "polar-meridian" },
  ] },
  { id: "locked-configuration", title: "Locked configuration", reference: "/configuration.html#section-locked-configuration", demonstrations: [
    { pattern: "polar-meridian", section: "protected-archive", label: "Configure an approved enterprise mail service", scenario: "polar-meridian" },
  ] },
  { id: "protected-content", title: "S/MIME protection", reference: "/security.html#section-sending-smime", demonstrations: [
    { pattern: "custom-handoff", section: "protected-packages", label: "Protect a message without SMTP", scenario: "custom-handoff" },
    { pattern: "protected-partners", section: "byte-preserving-archive", label: "Verify and archive a partner message", scenario: "protected-partners" },
  ] },
  { id: "exact-content", title: "Exact-message submission", reference: "/features.html#section-exact-eml", demonstrations: [
    { pattern: "polar-meridian", section: "protected-archive", label: "Compare archived and submitted bytes", scenario: "polar-meridian" },
  ] },
  { id: "custom-mailer", title: "CustomMailer", reference: "/features.html#section-custom-mailer", demonstrations: [
    { pattern: "custom-handoff", section: "non-smtp-handoff", label: "Hand prepared mail to an HTTPS gateway", scenario: "custom-handoff" },
  ] },
  { id: "smtp-client-identity", title: "SMTP client hostname", reference: "/features.html#section-smtp-client-hostname", demonstrations: [
    { pattern: "aws-correspondence", section: "identify-the-application-to-ses", label: "Give a container a stable SMTP identity", scenario: "aws-correspondence-cloud" },
  ] },
  { id: "send-results", title: "Submission results and observation", reference: "/analyzing-send-results.html", demonstrations: [
    { pattern: "polar-meridian", section: "observation-failures", label: "Make failed result storage visible", scenario: "polar-meridian" },
    { pattern: "relaydesk", section: "tenant-isolation", label: "Keep evidence with its customer", scenario: "relaydesk" },
  ] },
  { id: "telemetry", title: "OpenTelemetry", reference: "/opentelemetry.html", demonstrations: [
    { pattern: "polar-meridian", section: "opentelemetry", label: "Inspect exported send traces and metrics", scenario: "polar-meridian-observability" },
  ] },
  { id: "delivery-reports", title: "Reading delivery reports", reference: "/delivery-reports.html", demonstrations: [
    { pattern: "incoming-feedback", section: "delivery-reports-into-application-data", label: "Turn a notification into an HTTP integration", scenario: "incoming-feedback" },
    { pattern: "mail-workflow", section: "inspect-the-failure-not-just-the-happy-path", label: "Feed later mail facts into a workflow", scenario: "mail-workflow" },
  ] },
]);

const identities = patternDemonstrations.map((entry) => entry.id);
if (new Set(identities).size !== identities.length) throw new Error("Demonstration topic IDs must be unique");

export function patternExamples(id) {
  const found = patternDemonstrations.find((entry) => entry.id === id);
  if (!found) throw new Error(`Unknown demonstration topic: ${id}`);
  return found.demonstrations.map((example) => ({ ...example, href: `/patterns/${example.pattern}.html#${example.section}` }));
}

export function demonstratedReferences(slug) {
  return patternDemonstrations.filter((entry) => entry.demonstrations.some((example) => example.pattern === slug));
}
