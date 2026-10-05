# Journal application examples

`PolarMeridianDispatcherTest.java` runs without sending email. It uses real offline MIME/S/MIME preparation, fake submission calls, and an isolated in-memory H2 database. The H2 check exercises JDBC transactions and concurrent connections; it is not a PostgreSQL integration or throughput test.

Requirements: JDK 11 or newer, the current Simple Java Mail 10.0.0 development classes and their dependencies, plus H2 (validated with 2.1.214). Do not substitute the published 9.x API. The examples deliberately live in the website, not in the Java library's reactor.

From the website directory, supply the development/test dependency classpath and a disposable output directory:

```powershell
$exampleClasses = New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) ('polar-example-' + [Guid]::NewGuid().ToString('N')))
# Set $exampleClasspath to the development classes/dependencies, including H2.
javac -proc:none --release 11 -cp $exampleClasspath -d $exampleClasses.FullName `
  src/assets/journal/articles/polar-meridian/examples/PolarMeridianDispatcher.java `
  src/assets/journal/articles/polar-meridian/examples/OrderConfirmationComposer.java `
  src/assets/journal/articles/polar-meridian/examples/JdbcDispatchLimits.java `
  tests/journal-examples/PolarMeridianDispatcherTest.java
if ($LASTEXITCODE -ne 0) { throw 'Compilation failed' }
java -cp "$($exampleClasses.FullName);$exampleClasspath" PolarMeridianDispatcherTest `
  src/assets/journal/articles/polar-meridian/examples/dispatch-limits.sql `
  ../modules/simple-java-mail/src/test/resources
```

The tests cover the concrete order-confirmation composer, permission/certificate/final-message failures, quota deferral, full queues, attempt identity, actual-envelope counts, selective retention, archived/submission byte identity, S/MIME decryption/signature integrity, DSN/REQUIRETLS preservation, Bcc/header safety, confirmed/partial/unknown outcomes, failed archive insertion, rejected callbacks, failed request updates, rate and rolling-day accounting, unfinished charges, sending quota group isolation and competing JDBC connections. The schema is loaded only into the in-memory test database.

`RelayDeskMailExamplesTest.java` additionally exercises tenant-scoped key selection (including configured and hidden recipients), missing-key holds, real offline OpenPGP signing/encryption/decryption, recipient-level retry feedback, optional size facts and the authenticated-probe call. Its source/compile instructions are in the [RelayDesk README](../../src/assets/journal/articles/relaydesk/examples/README.md). Both suites use only public test certificates/keys from the Java checkout; they do not validate production PKI or contact mail servers. Synthetic receipt/probe checks do not prove SMTP wire behavior; the Java library's protocol tests cover that separately.
