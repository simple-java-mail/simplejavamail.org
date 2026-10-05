# Case study: Everybody Brought Their Own Mail Server

Editorial outline for the [RelayDesk Journal draft](../src/journal/2026-09-12-everybody-brought-their-own-mail-server.md). The article is unpublished and uses a provisional sorting/publication date. Write from a completed Simple Java Mail 10.0.0 perspective, while distinguishing its existing client facilities from application integrations we still need to design and test.

## Company name and profile

**RelayDesk** is an old, trusted multi-party case platform in a lightly cyberpunk future. Nobody knows who operates it; an AI and a relic from the before time are rumours, not established facts. Fixers, information brokers and businesses use it to coordinate participants, evidence, conversations, assignments, deadlines and agreements. Customer support is one use of this broader product. Its Java backend runs in Europe and North America; contractors such as Sam work on its integrations. General incoming-mail processing is outside the scope; the article does cover correlating later delivery reports with outgoing attempts.

RelayDesk offers a default sending service, but some customers require outgoing mail to pass through their own approved infrastructure. Those customers supply the endpoints, authentication requirements, sender permissions and operational contacts. Some provide one managed hostname; others provide several equivalent relays or separately approved regional routes.

Sam is a freelance orc Java developer, not a RelayDesk employee or an administrator of every customer's mail system. His repair contract lets him improve the integration and coordinate an approved change. It does not let him reset a customer's password, relax its firewall or silently substitute another customer's working relay. Maya is an AI case coordinator within Kestrel's authorized workspace; she cannot change SMTP settings or credentials.

Keep the character of the company practical and slightly weary of integration surprises. The humour comes from an apparently simple settings screen turning into customer-specific operational work, not from incompetent customers or an elaborate villain.

## Position among the case studies

- **Staple & Sons:** a small company assembles and operates its own Linux relay setup. SJM can conveniently coordinate submission across its equivalent relays.
- **Polar Meridian Systems:** applications use an established corporate mail service. Leave existing infrastructure responsibilities there; justify any additional client-side topology.
- **RelayDesk:** one product must work with infrastructure selected and operated by many customers. Correct route selection, connection reuse and configuration changes become product concerns.

These are the agreed editorial directions for the three stories, not a claim that every existing draft has already been revised to match them. No special series metadata is required; the articles can stand alone under the shared "Case study:" title prefix.

## Hook, through-line and ending

**Hook:** Maya has found a shopper's missing Logicoma MKII spider-bot, but her reply is stuck because Kestrel Outfitters rotated its SMTP password on Friday afternoon. RelayDesk posts a repair gig, which Sam accepts in the opening bar scene; the incident later explains that same gig.

**Through-line:** Sam repairs the sending integration around the reply Maya needs to send, while Anika supplies and maintains Kestrel's approved configuration. Follow onboarding, customer isolation, bounded resources, understandable results and the credential replacement. Juniper Nomad keeps sending through its separate managed endpoint. Resolve Maya's original reply before introducing the next ticket's late bounce.

**Ending:** Maya's shopper has the answer, Anika's new configuration is in use and Juniper was unaffected. The next bounce is visible in the ticket without Sam investigating the whole platform. SJM's connection reuse, pooling and submission results enable this; RelayDesk supplies the surrounding customer permissions and operational process.

The lesson is not that multiple clusters are universally necessary. It is that a product integrating with independently operated mail services needs to distinguish which connections are interchangeable and manage the resources and results accordingly.

## People and editorial constraints

- **Maya:** Kestrel's AI case coordinator, pictured through an avatar. May inspect permitted support records and submit authorized replies, not alter mail configuration. Human staff can inspect the same saved evidence; UI helpers are not an AI subsystem.
- **Sam:** a freelance orc Java developer on a RelayDesk repair contract. Can change the integration, not every customer's mail infrastructure.
- **Anika:** Kestrel's mail administrator. Approves regional endpoints, credentials, sender/return addresses and changes. She is not a villain or an incompetent customer.
- **Kestrel Outfitters:** sells drones, spare parts and field equipment for riggers. Two interchangeable EU relays and a separately approved US pair; Maya's ticket uses EU only. A fixer brokered the deal, but Kestrel authorizes SMTP access.
- **Juniper Nomad Air Services:** formal name at introduction, Juniper Nomad in diagrams and captions, Juniper thereafter. One managed hostname; its continuing service makes customer isolation concrete without adding a fourth persona.

Keep this smaller than Polar Meridian. Use that article for deep observer persistence/monitoring, not another full archive tutorial. The revised prose is approximately 2,400 words, essentially unchanged from the previous draft; diagrams and code carry more of the explanation. Keep the fourth-wall banner and dry humour. No invented autobiographical claims or unrequested persona photos.

## Revised section and skim sequence

1. **The setup.** A company/service topology includes the default sending service alongside customer integrations, without implying a global shared pool. Caption: “The reply starts in RelayDesk, but its customer decides which mail service may carry it.”
2. **The settings screen opens a network connection.** Onboarding and security precede any runnable connection recipe. Short questions/bullets cover administrator permission, reachable destinations, TLS identity and allowed senders. Leave existing domain signing with the customer unless its agreement says otherwise.
3. **Maya's reply cannot borrow Juniper's connection.** Define route before using it. Map customers/regions to eligible pools; a small two-member example leads into the reusable Mailer helper. Captions contrast approved sharing with customer isolation, then zero-core/idle expiry with busy-customer limits.
4. **Juniper's replies still need to leave.** A compact collaboration diagram separates durable waiting jobs from eligible sends. Explain per-customer admission, the four-entry per-Mailer queue, explicit rejection, claim waits and send deadlines. Do not imply SJM pool keys implement distributed fairness.
5. **Maya needs an answer, not an SMTP transcript.** Record attempts before sending, correlate the terminal observer with the initial Message-ID, and show product-facing statuses. Deal with unknown/partial results here because replacement and retry depend on that distinction.
6. **Anika updates Kestrel's settings without stopping Juniper.** A sequence diagram shows route-wide pause, accounting for in-flight work, close/rebuild/test and resume. Explicitly distinguish credential replacement from changing first-registration pool policy. Service discovery is now a short subsection here, not a new late narrative thread.
7. **Accepted by SMTP. Then a bounce arrives.** Resolve Maya's original reply first. A second ticket demonstrates Reply-To, MAIL FROM, DSN and ENVID, followed by a small ticket-history example. Captions explain the separate return paths and why later failure does not erase earlier acceptance.
8. **Back to Maya's support ticket.** Close all three personas' practical concerns, link the useful SJM capabilities and finish Sam's contract with the existing RUN COMPLETE debrief, credits and “Jack out.”

The companion helpers and no-network tests cover actual 10.0.0 message/observer APIs. They deliberately do not invent a complete SJM tenant registry, scheduler or hot-reload API. Existing draft/publication TODOs remain.

## Technical coverage to retain

### Customer-approved services

Establish why a branded From address alone does not meet the customer's requirements. The existing mail route may carry policy and audit expectations. Introduce one managed endpoint, one equivalent relay pair and one customer with separately approved regional routes. Do not assume every provider allows SMTP submission without prior configuration.

### Customer and regional pool selection

Show two decisions: the application selects the authorized customer route; SJM selects a connection within that route's eligible pool group. Use one small mapping table. Route configuration is operator/application controlled, not an arbitrary cluster key supplied by an end user.

Make the qualification explicit: one endpoint per customer normally means independent reusable Mailers. Explicit multi-server clusters are useful only where there are multiple interchangeable endpoints. A cluster key does not supply customer authorization, data residency, global quotas or distributed coordination.

### Endpoint onboarding and security

Treat endpoint onboarding as outbound network access. Cover administrator permissions, constrained configuration, destination and port restrictions, TLS identity checks and protected credentials. Separate public endpoints from deliberately approved private-network integrations. Leave DKIM and other existing mail-service controls with the customer unless an actual requirement moves them into the application.

Use [OWASP's SSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) for the general risk and application/network defenses. Do not imply that validating a hostname once or configuring a Mailer is a complete SSRF defense.

### Resource limits

Discuss reusable Mailers in a bounded application registry, zero-core/idle-expiring pools where appropriate, and deliberate retirement. Count resource use across all pools and replicas. Distinguish closing sockets from removing every retained pool or cluster configuration entry.

### Fair dispatch

A customer relay stalls. Application admission and fair dispatch prevent it from occupying all execution capacity. Pool limits, queue limits and supported send deadlines serve different purposes. Keep the backlog durable and pace recovery. Separate pool groups alone do not establish fair scheduling.

### Configuration replacement

Return to the opening incident. Use an immutable configuration revision and a simple route-scoped pause, drain, close, rebuild and resume as the baseline design. Other routes continue operating. Explain first-registration cluster settings before suggesting replacement in an existing cluster.

Discuss seamless replacement only as a further integration requiring implementation and tests. Plan retirement of old configuration generations, resource budgets and urgent revocation. Do not advertise built-in hot reload or a tested Spring Cloud adapter.

### Submission and later delivery results

Reuse the conversation's stored content and add attempt records. The terminal observer correlates outcomes and recorded stage timings with customer, route and configuration revision. Define application UI states without presenting them as SJM enums or per-transition callbacks.

Distinguish preparation failure, authentication failure, confirmed submission and ambiguous results. Recording failure must not trigger resending. Link to Polar Meridian for deeper asynchronous observer persistence and monitoring rather than repeating its archive tutorial.

Follow another reply that is accepted by SMTP, then bounces five minutes later. Separate human replies (`Reply-To`), delivery failures (the SMTP envelope sender configured with `withBounceTo(...)`), SMTP DSN requests, and optional receipt-request headers. Include a short per-customer routing example with stored conversation and attempt tokens. Customer onboarding approves and tests the return addresses, envelope-sender permissions and domain authentication. RelayDesk's incoming-mail integration validates and correlates reports with the customer, ticket and attempt; the SJM completion observer does not receive later bounces. Preserve the successful submission record when recording a later delivery failure, and do not automatically resend to a reported invalid address. Keep read receipts a brief optional aside, never a dependable indication of whether the recipient read the reply.

### Stable endpoints and discovery

Usually not for the initial design. Managed hostnames and [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/) can hide changing server addresses. [Spring Cloud refresh scope](https://docs.spring.io/spring-cloud-commons/reference/spring-cloud-commons/application-context-services.html#refresh-scope) is a possible configuration-integration tool, not proof of safe SMTP route replacement. Let a real requirement justify direct endpoint discovery later.

### Payoff

Finish with the affected reply and an understandable user-visible result. The company has made its product work with other people's infrastructure; it has not turned every customer's mail system into its own managed fleet.

## Technical evidence and checks before publication

- Pin cluster examples to `MailerGenericBuilder.withClusterKey(...)` and the actual selected-Session behavior. Only approved interchangeable Sessions share a group.
- Verify configuration replacement against the current `SimpleJavaMail` snapshot factory, Mailer drain/close behavior, `BatchTransportEngine` registration/retirement and the underlying pool implementation.
- In particular, audit repeated customer/configuration churn: closing the last Mailer must not be assumed to discard all retained cluster settings or definitions. Prove bounded resource and metadata behavior before publishing a runtime registry recipe.
- Test admission racing with route pause/retirement, one customer's failure while others send, partial group construction failure, credential rotation and shutdown with active sends. No such runtime tests are claimed by this first prose draft.
- Verify that customer egress restrictions account for DNS changes and actual connection destinations, including existing pooled connections. Keep private customer connectivity an explicit, separately authorized deployment choice.
- Validate callback dispatch and persistence failures separately from SMTP outcomes. Preserve ambiguous submission results rather than automatically retrying them.
- Validate approved Reply-To and envelope-sender routes against each customer's service, including rewrites, DSN support, later bounces, duplicate reports and tenant/attempt/recipient correlation. Receiving and processing those reports is application integration work, not another send-completion callback.
- The executable helpers live in `src/assets/journal/articles/relaydesk/examples/`, with a standalone test in `tests/journal-examples/RelayDeskMailExamplesTest.java`. Verify compilation against current 10.0.0 classes, construction of Message-ID/Reply-To/envelope sender/DSN/ENVID, fresh retry IDs and unchanged observer correlation for accepted, rejected, partial, unknown and pre-send failures. These are not live SMTP, fleet-scheduling or reconfiguration tests.
- Keep both company facts and workload examples explicitly fictional. This scenario establishes a possible use, not evidence of real-world adoption or measured demand for multi-cluster pooling.
