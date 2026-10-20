# Application pattern fixtures

`JobCorrelatedMailerTest.java` exercises the downloadable job-correlation helper without SMTP. It uses two concurrent synthetic CustomMailer calls, two queued calls, and a rejected call. Latches coordinate execution and delayed outcome delivery; no sleep or assumed progress-event count establishes correctness.

Compile both helper/example sources and the fixture against freshly compiled reactor classes and dependencies. Do not substitute installed artifacts from an earlier API. From the website directory:

```powershell
$exampleClasses = New-Item -ItemType Directory -Path (Join-Path ([IO.Path]::GetTempPath()) ('job-correlation-' + [Guid]::NewGuid().ToString('N')))
# Set $exampleClasspath to current reactor target/classes and test dependencies.
javac -proc:none --release 11 -cp $exampleClasspath -d $exampleClasses.FullName `
  src/assets/guides/job-correlation/JobCorrelatedMailer.java `
  src/assets/guides/job-correlation/JobCorrelationExample.java `
  tests/application-examples/JobCorrelatedMailerTest.java
if ($LASTEXITCODE -ne 0) { throw 'Compilation failed' }
java -cp "$($exampleClasses.FullName);$exampleClasspath" JobCorrelatedMailerTest
```

The fixture inspects its application helper's private ThreadLocal only to verify cleanup; no testing accessor is added to the helper. It verifies every terminal outcome in this controlled, non-rejecting observer-executor fixture, while permitting progress to be combined, dropped or delivered after outcomes. This does not establish SMTP delivery, database durability or executor/broker delivery guarantees.
