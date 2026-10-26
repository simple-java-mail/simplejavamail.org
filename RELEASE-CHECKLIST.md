# Website release update list

The current Simple Java Mail release is centralized in Eleventy's global data file, `src/_data/site.json`. For an ordinary library release, update that file rather than editing the rendered mentions separately.

## 10.0.0 website and Journal comments launch

Publish the 10.0.0 website, Journal series and comments only after the Simple Java Mail 10.0.0 library artifacts and release tag are available. Complete the checks below on the reviewed website content, then publish through the existing `develop` pipeline.

The Terraform migration and comments backend are already deployed. [#759](https://github.com/bbottema/simple-java-mail/issues/759) on the [10.0.0 Project board](https://github.com/users/bbottema/projects/1) tracks the remaining launch work: deployment health, public Journal/comments checks, Google OAuth Production, authentication, moderation and notifications. Complete that item before closing the 10.0.0 milestone.

## Every library release

- [ ] Update `version` in `src/_data/site.json`.
- [ ] Update `releaseDate` in `src/_data/site.json`.
- [ ] Confirm `javaBaseline` still matches the supported Java baseline.
- [ ] Search for an accidentally hard-coded copy of the previous release:
  `rg -n "<previous-version>" src content-plan`
- [ ] Run `npm run check`.
- [ ] Run `npm run verifyLinks:internal`.
- [ ] Run `npm run build` and confirm Pagefind indexes all public pages.
- [ ] Run `npm run verifyIndexability` against that build. Every sitemap URL must resolve to a page with its own canonical URL and no `noindex`; the 404 page stays out of the sitemap and site search.
- [ ] Spot-check the release consumers listed below.
- [ ] Optionally run `npm run verifyLinks:external`; keep this out of the deployment gate because third-party sites can rate-limit or time out.

## Pages generated from `site.version`

Updating `src/_data/site.json` changes all of these automatically:

- Homepage hero release label.
- Homepage “Current release” fact and release date.
- Homepage Maven coordinate.
- Get Started Maven dependency.
- Get Started Gradle dependency.
- Site-wide footer version.
- `SoftwareSourceCode` JSON-LD metadata on every page.

The homepage release date is generated from `site.releaseDate`.

### Source inventory

| Source | Generated use |
| --- | --- |
| `src/pages/index.hbs` | Hero label, release fact, and Maven coordinate |
| `src/pages/download.hbs` | Maven and Gradle dependencies |
| `src/_includes/footer.hbs` | Site-wide footer version |
| `src/_includes/head.hbs` | Site-wide JSON-LD software version |

## Update only when the release requires it

- [ ] Add or revise migration notes for a breaking or major release.
- [ ] Update the migration landing page and documentation navigation when a new guide is added.
- [ ] Review module-baseline wording when artifact contents change.
- [ ] Review security “since version” notes when behavior changes.
- [ ] Review Java baseline, Javadocs, Maven Central, and release links if their targets change.
- [ ] Review the shared mail-send infographic against the implementation for this release. Its master and wording source are in the Simple Java Mail repository under `docs/concurrency/`; do not independently edit `src/assets/architecture/inside-a-mail-send.png`.
- [ ] After an infographic update, copy the master PNG, refresh the revision query in `src/_includes/components/mail-send-architecture.hbs`, and check its inline/full-size views plus the umbrella issue's embed. Record an updated-or-unchanged review in the master maintenance notes; matching copies alone do not establish that the architecture is current.

## Version numbers that are not the current library release

Do not bulk-replace these:

- `package.json` version: version of the website package, not Simple Java Mail.
- Migration filenames and copy for 5.0, 6.0, 7.0, and 9.0: historical documentation.
- Security notes such as “since 8.6.0”: historical behavior boundaries.
- Module notes such as “as of 9.0.0”: historical artifact changes.
- CLI dependency versions: versions of third-party CLI dependencies.
- SMTP replies such as `250 2.0.0 queued`: SMTP enhanced status codes, not software versions.
