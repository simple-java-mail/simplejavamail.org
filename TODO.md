# Website TODOs

- Streamline the batch-related documentation. The current documentation is stretched across vanilla async sending, `sendMailsInSimpleBatch(...)`, and batch-module powered pooling/clustering; it needs one coherent story about when to use each path.
- Update the grand example on the front page (`src/pages/index.hbs`) with the 9.0.0 API additions, including recipient builders, per-recipient S/MIME, DSN, pre-encoded resources, explicit resource `Content-ID`, local bind address, debug output routing, and simple sequential batch sending.
- After the website usage documentation is updated for the 9.0.0 changes, retrofit the README issue entries with links to the relevant usage-documentation sections.
- Update the batch-module configuration section (`src/pages/configuration.hbs`) for per-cluster Java configuration: first `Mailer` per cluster key defines that cluster's pool defaults, claim timeout, expiry, and load balancing; property-only multi-cluster configuration remains tracked separately and migration notes should call out the old JVM-global behavior.
