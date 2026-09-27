# Journal application examples

`PolarMeridianDispatcherTest.java` runs without sending email. It uses real Simple Java Mail types, fake Mailers, and an isolated in-memory H2 database. The H2 check exercises JDBC transactions and concurrent connections; it is not a PostgreSQL integration or throughput test.

Requirements: JDK 11 or newer, the current Simple Java Mail 10.0.0 development classes and their dependencies, plus H2 (validated with 2.1.214). Do not substitute the published 9.x API. The examples deliberately live in the website, not in the Java library's reactor.

From the website directory, supply the development/test dependency classpath and a disposable output directory:

```powershell
$exampleClasses = New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) ('polar-example-' + [Guid]::NewGuid().ToString('N')))
# Set $exampleClasspath to the development classes/dependencies, including H2.
javac -proc:none --release 11 -cp $exampleClasspath -d $exampleClasses.FullName `
  src/assets/journal/examples/polar-meridian/PolarMeridianDispatcher.java `
  src/assets/journal/examples/polar-meridian/JdbcDispatchLimits.java `
  tests/journal-examples/PolarMeridianDispatcherTest.java
if ($LASTEXITCODE -ne 0) { throw 'Compilation failed' }
java -cp "$($exampleClasses.FullName);$exampleClasspath" PolarMeridianDispatcherTest `
  src/assets/journal/examples/polar-meridian/dispatch-limits.sql
```

The tests cover permission/certificate/final-message failures, quota deferral, full queues, attempt identity, recipient counts, confirmed/partial/unknown outcomes, failed archive insertion, rejected callbacks, failed request updates, rate and rolling-day accounting, unfinished charges, scope isolation and competing JDBC connections. The schema is loaded only into the in-memory test database.
