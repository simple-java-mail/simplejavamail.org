# Case study: Everybody Brought Their Own Mail Server

Editorial outline for the [RelayDesk Journal draft](../src/journal/2026-09-12-everybody-brought-their-own-mail-server.md). The article is unpublished and uses a provisional sorting/publication date. Write from a completed Simple Java Mail 10.0.0 perspective, while distinguishing its existing client facilities from application integrations we still need to design and test.

## Company name and profile

**RelayDesk** is a fictional customer-support SaaS company. About a dozen engineers maintain a Java backend deployed in Europe and North America. Its growing customer base consists of businesses that need shared support conversations, outgoing replies, attachments and case updates. Receiving messages is outside this article's scope.

RelayDesk offers a default sending service, but some customers require outgoing mail to pass through their own approved infrastructure. Those customers supply the endpoints, authentication requirements, sender permissions and operational contacts. Some provide one managed hostname; others provide several equivalent relays or separately approved regional routes.

Its engineers are competent product developers, not administrators of every customer's mail system. They can fix RelayDesk, improve its diagnostics and coordinate a change. They cannot reset a customer's password, relax its firewall or silently substitute another customer's working relay.

Keep the character of the company practical and slightly weary of integration surprises. The humour comes from an apparently simple settings screen turning into customer-specific operational work, not from incompetent customers or an elaborate villain.

## Position among the case studies

- **Staple & Sons:** a small company assembles and operates its own Linux relay setup. SJM can conveniently coordinate submission across its equivalent relays.
- **Polar Meridian Systems:** applications use an established corporate mail service. Leave existing infrastructure responsibilities there; justify any additional client-side topology.
- **RelayDesk:** one product must work with infrastructure selected and operated by many customers. Correct route selection, connection reuse and configuration changes become product concerns.

These are the agreed editorial directions for the three stories, not a claim that every existing draft has already been revised to match them. No special series metadata is required; the articles can stand alone under the shared "Case study:" title prefix.

## Hook, through-line and ending

**Hook:** A support ticket is resolved, but the reply has not left RelayDesk because the customer changed an SMTP password on Friday afternoon.

**Through-line:** Follow that reply from a saved conversation through customer-specific routing, connection acquisition and submission. Introduce each operational complication through something RelayDesk must answer for its users.

**Ending:** The affected customer resumes sending after its approved configuration change. Other customers were not interrupted. The support agent can see the result without needing an engineer to investigate the entire platform.

The lesson is not that multiple clusters are universally necessary. It is that a product integrating with independently operated mail services needs to distinguish which connections are interchangeable and manage the resources and results accordingly.

## Section outline

### 1. Send from our address, through our servers

Establish why a branded From address alone does not meet the customer's requirements. The existing mail route may carry policy and audit expectations. Introduce one managed endpoint, one equivalent relay pair and one customer with separately approved regional routes. Do not assume every provider allows SMTP submission without prior configuration.

### 2. One customer is not another customer's fallback

Show two decisions: the application selects the authorized customer route; SJM selects a connection within that route's eligible pool group. Use one small mapping table. Route configuration is operator/application controlled, not an arbitrary cluster key supplied by an end user.

Make the qualification explicit: one endpoint per customer normally means independent reusable Mailers. Explicit multi-server clusters are useful only where there are multiple interchangeable endpoints. A cluster key does not supply customer authorization, data residency, global quotas or distributed coordination.

### 3. The settings screen opens a network connection

Treat endpoint onboarding as outbound network access. Cover administrator permissions, constrained configuration, destination and port restrictions, TLS identity checks and protected credentials. Separate public endpoints from deliberately approved private-network integrations. Leave DKIM and other existing mail-service controls with the customer unless an actual requirement moves them into the application.

Use [OWASP's SSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html) for the general risk and application/network defenses. Do not imply that validating a hostname once or configuring a Mailer is a complete SSRF defense.

### 4. A quiet customer still costs resources

Discuss reusable Mailers in a bounded application registry, zero-core/idle-expiring pools where appropriate, and deliberate retirement. Count resource use across all pools and replicas. Distinguish closing sockets from removing every retained pool or cluster configuration entry.

### 5. One slow server is not everybody else's problem

A customer relay stalls. Application admission and fair dispatch prevent it from occupying all execution capacity. Pool limits, queue limits and supported send deadlines serve different purposes. Keep the backlog durable and pace recovery. Separate pool groups alone do not establish fair scheduling.

### 6. Somebody changed the password

Return to the opening incident. Use an immutable configuration revision and a simple route-scoped pause, drain, close, rebuild and resume as the baseline design. Other routes continue operating. Explain first-registration cluster settings before suggesting replacement in an existing cluster.

Discuss seamless replacement only as a further integration requiring implementation and tests. Plan retirement of old configuration generations, resource budgets and urgent revocation. Do not advertise built-in hot reload or a tested Spring Cloud adapter.

### 7. Tell the support agent what actually happened

Reuse the conversation's stored content and add attempt records. The terminal observer correlates outcomes and recorded stage timings with customer, route and configuration revision. Define application UI states without presenting them as SJM enums or per-transition callbacks.

Distinguish preparation failure, authentication failure, confirmed submission and ambiguous results. Recording failure must not trigger resending. Link to Polar Meridian for deeper asynchronous observer persistence and monitoring rather than repeating its archive tutorial.

Follow another reply that is accepted by SMTP, then bounces five minutes later. Separate human replies (`Reply-To`), delivery failures (the SMTP envelope sender configured with `withBounceTo(...)`), SMTP DSN requests, and optional receipt-request headers. Include a short per-customer routing example with stored conversation and attempt tokens. Customer onboarding approves and tests the return addresses, envelope-sender permissions and domain authentication. RelayDesk's incoming-mail integration validates and correlates reports with the customer, ticket and attempt; the SJM completion observer does not receive later bounces. Preserve the successful submission record when recording a later delivery failure, and do not automatically resend to a reported invalid address. Keep read receipts a brief optional aside, never a dependable indication of whether the recipient read the reply.

### 8. Do we need service discovery for this?

Usually not for the initial design. Managed hostnames and [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/) can hide changing server addresses. [Spring Cloud refresh scope](https://docs.spring.io/spring-cloud-commons/reference/spring-cloud-commons/application-context-services.html#refresh-scope) is a possible configuration-integration tool, not proof of safe SMTP route replacement. Let a real requirement justify direct endpoint discovery later.

### 9. Back to the support ticket

Finish with the affected reply and an understandable user-visible result. The company has made its product work with other people's infrastructure; it has not turned every customer's mail system into its own managed fleet.

## Technical evidence and checks before publication

- Pin cluster examples to `MailerGenericBuilder.withClusterKey(...)` and the actual selected-Session behavior. Only approved interchangeable Sessions share a group.
- Verify configuration replacement against the current `SimpleJavaMail` snapshot factory, Mailer drain/close behavior, `BatchTransportEngine` registration/retirement and the underlying pool implementation.
- In particular, audit repeated customer/configuration churn: closing the last Mailer must not be assumed to discard all retained cluster settings or definitions. Prove bounded resource and metadata behavior before publishing a runtime registry recipe.
- Test admission racing with route pause/retirement, one customer's failure while others send, partial group construction failure, credential rotation and shutdown with active sends. No such runtime tests are claimed by this first prose draft.
- Verify that customer egress restrictions account for DNS changes and actual connection destinations, including existing pooled connections. Keep private customer connectivity an explicit, separately authorized deployment choice.
- Validate callback dispatch and persistence failures separately from SMTP outcomes. Preserve ambiguous submission results rather than automatically retrying them.
- Validate approved Reply-To and envelope-sender routes against each customer's service, including rewrites, DSN support, later bounces, duplicate reports and tenant/attempt/recipient correlation. Receiving and processing those reports is application integration work, not another send-completion callback.
- If executable examples are added, clearly identify RelayDesk application services and supply a tested fixture instead of inventing SJM registry, tenant-routing or refresh APIs.
- Keep both company facts and workload examples explicitly fictional. This scenario establishes a possible use, not evidence of real-world adoption or measured demand for multi-cluster pooling.
