# Case study: Your Mail Server Works for a Troll Farm Now

Planning outline for an unpublished Engineering Journal article, written from the perspective of a completed Simple Java Mail 10.0.0 release. This is a recovery story, with security choices emerging from specific incidents. Polar Meridian carries the deeper infrastructure, monitoring and alerting examples; keep pooling and observability lightweight here.

The narrative draft is now in [the Journal authoring directory](../src/journal/2026-09-11-your-mail-server-works-for-a-troll-farm-now.md). The outline below remains the editorial brief.

## Company profile

Staple & Sons is a fictional regional supplier of office furniture, shelving and packaging materials. It has a warehouse, a sales team, a customer portal and two developers maintaining several applications. Normal mail volume is modest. The team learns through the incident and ends with a manageable small-business setup, not an enterprise platform. Keep the humour dry and let the mistakes come from familiar compromises rather than making the engineers incompetent.

## Adversary

A fictional troll farm runs coordinated spam, harassment and phishing campaigns through other people's services. Staple & Sons is one of several businesses it exploits, useful for its email feature rather than singled out for a personal vendetta. Keep the wider operation mostly offstage. The company can stop providing resources to it without bringing down the whole farm. Establish any additional access needed for later incidents explicitly; the initial portal account does not grant control of the network or SMTP infrastructure.

## Narrative sequence

Introduce the company and its ordinary setup before anything goes wrong. For each problem, let the reader see the symptoms, follow the investigation, and then reach the remedy. Do not explain the attack before the company has something to investigate.

The first topology is neutral: customer, portal and worker, database queue, SMTP relay and recipient servers. Repeat it once when the investigation identifies the abusive account, adding the troll farm in red. Later diagrams show only the affected part of the system. Use red for an established attacker and its entry route, not for normal infrastructure merely being misused. The archive first appears when the company adds it during recovery; it is not part of the original setup.

Not every subsequent finding needs another compromise. Shared capacity is a remaining operational problem, and message confidentiality is a requirement exposed by the review. Do not give the farm unexplained access just to put a red node in every diagram.

## Hook

The fictional company sells shelving, packaging and office supplies. Its customer portal sends quotations, invoices, order updates and newsletters. Email has always been something that happens in the background.

Then invoices start arriving late, and password resets follow. Save the enthusiastic customer and the explanation for the investigation, after the company's attempt to buy its way out of the delays.

The joke belongs after that reveal, not in the introduction:

> The company added another SMTP server. The troll farm appreciated their investment.

## 1. The setup

Follow one ordinary quotation from the portal to a recipient. Establish an application, queue, reusable Simple Java Mail mailer and SMTP server. Password resets, invoices and customer-generated correspondence share much of the setup.

Show why the quotation-sharing feature grew: a colleague recipient, then several recipients and a more flexible note. Stay with the ordinary business use here; let the later investigation explain what the combined features permit.

## 2. Apparently, we need more servers

Queues grow, invoices arrive late and password resets become unreliable. The company initially responds with more workers, larger pools and additional SMTP servers. Retries add to the pressure. Describe what the team observes, without identifying the account or the farm yet.

Keep the expanding SMTP farm as one memorable episode, not a cluster-configuration tutorial. The turning point comes when someone asks what all these messages actually are.

## 3. Who are we sending all this mail for?

The investigation finds that most capacity serves one account. Recipient addresses and message content reveal how the quotation feature is being used. Only now introduce the troll farm and its customer-level foothold. Revisit the opening topology with that account in red. No SMTP credentials or network access were needed: the application sends on the farm's behalf.

## 4. Stop sending their mail

Disable the abusive route, quarantine pending work and investigate what the account could access. Revoke exposed credentials where necessary. If infrastructure itself is compromised, restore trusted operation before treating configuration changes as a remedy.

Repair application authorization: which actions may generate mail, who chooses recipients and sender identities, what content can be supplied, and which customer limits and consent/suppression rules apply. Connect these decisions to validation and mailer settings without implying that the library decides business authorization.

Show the header-injection checks and a small `withMaximumEmailSize(...)` example. The encoded-message limit complements the application's input limits; it does not bound the memory used to construct an email.

Introduce a small application-managed email archive backed by a database or protected document store. Use 10.0.0's `MailSendObserver.onMailSendCompleted(MailSendOutcome)` to associate the application's email record or protected archive reference with the send-attempt/customer ID and terminal outcome. Keep unsuccessful attempt records as well. This provides evidence for subsequent investigations, not a retroactive record of mail sent before archiving existed. Keep message content out of ordinary logs and mention archive access and retention briefly.

## 5. Give the servers a chance to breathe

Start with the remaining delays after the campaign has been quarantined: legitimate newsletters can still hold up account mail. Show the two routes competing for shared workers and waiting slots in a cropped diagram, then tune the setup.

Control admitted work and concurrent sends, pace backlog recovery, and prevent bulk work from consuming all capacity for essential account messages. Distinguish connection concurrency from sending-rate limits. Avoid treating uncertain send outcomes as a reason to resend automatically.

Briefly show the completion observer logging the recorded stages and processing times, correlated by send-attempt ID. The outcome's request, ready, start and completion timestamps provide the timeline for the stages each attempt reached. Use those records to see where sends waited or spent time and compare behaviour before and after the changes. Keep this to a small practical demonstration of 10.0.0's capabilities; Polar Meridian builds monitoring and alerts around the same records.

Pair the timings with `getAsyncQueueSnapshot()` for estimated active/queued counts and rejection totals, not admission decisions. Distinguish the connection-claim timeout from `withMailSendTimeout(...)`, and retain the warning that a timeout does not prove SMTP non-acceptance.

Use `mailer.async().sendMail(...)` and `MailSend<MailSubmissionReceipt>` consistently. Retry only `QUEUE_FULL` automatically; other failures are held for the developers to inspect using archived receipts. Reuse one application dispatcher class with separate account/bulk Mailers and workload-filtered views of the same outbox. Keep that wiring brief, with no second dispatcher implementation.

Measure legitimate demand and retire capacity purchased to accommodate abuse. Pool tuning protects servers; it is not permission to send. Leave topology, sizing calculations and failover detail to Polar Meridian and the volume article.

## 6. We locked them out. Why are customers still getting our emails?

Customers report more suspicious mail after the account was suspended. Compare original message headers, archive records and relay logs before explaining that these messages originated elsewhere; absence from the archive alone is not proof. Show the external sender in red alongside the legitimate relay, both reaching recipient mail servers, with no portal in this diagram.

The farm has other sending routes and impersonates the company from outside its infrastructure. Introduce SPF, DKIM and DMARC through authorized sources, signing, alignment, reporting and an appropriate domain policy. Keep DNS and receiver responsibilities separate from Java configuration.

Reconnect to the earlier abuse: those messages could have passed authentication because the company's own authorized infrastructure sent them. Authentication is not a verdict that the message is harmless or wanted. Ground the explanation in the [DMARC specification](https://www.rfc-editor.org/rfc/rfc9989.html#section-1).

## 7. "But the connection was encrypted."

Start with a controlled test that succeeds when an invalid certificate should have stopped it. The investigation uncovers certificate-validation workarounds left behind after a deployment problem. Then explicitly establish an attacker-controlled point on the network path for this fictional incident; a customer account alone does not provide MITM capability. The focused diagram puts the red impersonating proxy between the worker and the real relay.

Distinguish optional STARTTLS being stripped from an encrypted connection to an impersonator accepted by permissive certificate handling. Repair the mailer's submission setup with mandatory TLS, proper trust configuration and server-identity verification. Test that unavailable required TLS or an invalid certificate prevents sending. Do not suggest that these choices secure every subsequent SMTP hop.

After rebuilding the Mailer with the corrected settings, briefly show `mailer.sync().probeConnection()` for dedicated connection diagnostics without sending a message. The report describes what that configured connection observed, not an independent certificate audit.

Sources: [STARTTLS security considerations](https://www.rfc-editor.org/rfc/rfc3207.html#section-6) and [certificate validation](https://www.rfc-editor.org/rfc/rfc8314.html#section-5.3).

Transition: We now know which server receives our email. What happens to the message after that?

## 8. Some of these emails contain more than shipping labels

The company exchanges confidential pricing agreements and commercially sensitive documents with established partners. A partner asks who can read those agreements. Follow the message beyond the first TLS connection to show why transport protection alone does not meet the requirement. This is a confidentiality review, not an invented compromise of the partner's systems. Introduce S/MIME signing and encryption through those requirements, including certificate exchange, recipient verification and private-key handling.

Use the [S/MIME specification](https://www.rfc-editor.org/rfc/rfc8551.html#section-1) to distinguish message protection from transport protection and domain authentication. Do not present S/MIME as a spam countermeasure, a universal newsletter setting, or a fix for sending sensitive content to an attacker the application wrongly authorized.

Send the protected pricing agreement through the same archive helper, preserving the dispatcher completion handling. Keep certificate verification before the example and give the retained archive copy its own short security-by-design conclusion.

## 9. Back to selling office furniture

Revisit the original failures using synthetic recipients and controlled test infrastructure: the abusive account cannot restart a campaign, pending work respects suspension and suppression, bulk traffic does not consume all password-reset capacity, fake SMTP endpoints fail verification, and outage recovery does not unleash uncontrolled retries.

Use the small archive and timing log to inspect outcomes. Completion is a terminal send-attempt event, not proof of delivery to a mailbox. Do not imply the observer alone guarantees a durable archive: archive-write failure must be visible and handled without blindly resending mail. Refer readers to Polar Meridian for the implementation and monitoring details.

End with the same unremarkable company, legitimate mail moving and a smaller justified SMTP setup. The troll farm is still operating elsewhere. Staple & Sons is no longer picking up part of the bill.

## Implementation notes

- Use the existing completion observer and `MailSendOutcome` to log the recorded stage transitions and their timestamps when each attempt completes.
- Establish how the application supplies the archive content and correlates it with each attempt. Do not claim an original `Email` reconstructed later is necessarily the exact transmitted, signed or encrypted EML.
- Keep archive storage and callback-dispatch guarantees explicit in the deeper Polar Meridian example. Do not represent a callback as an atomic SMTP/database transaction.
- Pin actual mailer examples to the completed 10.0.0 implementation. Keep application controls, SMTP-operator settings, DNS policy and recipient behaviour distinguishable throughout.
