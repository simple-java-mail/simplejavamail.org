import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("delivery-report examples inspect strong types without re-parsing source strings", () => {
  const source = readFileSync(new URL("../src/pages/delivery-reports.hbs", import.meta.url), "utf8");
  for (const contract of ["EnhancedStatusCode", "ReportedRecipient", "ReportedMailServer", "DeliveryDiagnostic"]) {
    assert.ok(source.includes(contract), contract);
  }
  assert.match(source, /status\.isPermanentFailure\(\)/);
  assert.match(source, /target\.getMailbox\(\)/);
  assert.match(source, /diagnostic\.getSmtpResponse\(\)\.getReturnCode\(\)/);
  assert.match(source, /getMailbox\(\).*?usually null/s);
  assert.doesNotMatch(source, /getOriginalRecipientType\(|getFinalRecipientType\(|getReportingServerType\(|getDiagnosticType\(/);
});

test("delivery-report guidance explains structured MIME and tolerant reading without inventing facts", () => {
  const source = readFileSync(new URL("../src/pages/delivery-reports.hbs", import.meta.url), "utf8");
  assert.match(source, /multipart\/report; report-type=delivery-status/);
  assert.match(source, /5\.01\.001/);
  assert.match(source, /completed header blocks remain available/);
  assert.match(source, /An interrupted block is not presented as complete/);
  assert.match(source, /Two competing parts/);
  assert.match(source, /an eager attachment read can still fail/);
  assert.match(source, /report\.getWarnings\(\)/);
});
