# Website release update list

The current Simple Java Mail release is centralized in `manifest/site.json`. For an ordinary library release, update that manifest rather than editing the rendered mentions separately.

## Every library release

- [ ] Update `version` in `manifest/site.json`.
- [ ] Update `releaseDate` in `manifest/site.json`.
- [ ] Confirm `javaBaseline` still matches the supported Java baseline.
- [ ] Search for an accidentally hard-coded copy of the previous release:
  `rg -n "<previous-version>" src manifest content-plan`
- [ ] Run `npm run check`.
- [ ] Run `npm run verifyLinks:internal`.
- [ ] Run `npm run build` and confirm Pagefind indexes all public pages.
- [ ] Spot-check the release consumers listed below.
- [ ] Optionally run `npm run verifyLinks:external`; keep this out of the deployment gate because third-party sites can rate-limit or time out.

## Pages generated from `site.version`

Updating `manifest/site.json` changes all of these automatically:

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
| `src/partials/footer.hbs` | Site-wide footer version |
| `src/partials/head.hbs` | Site-wide JSON-LD software version |

## Update only when the release requires it

- [ ] Add or revise migration notes for a breaking or major release.
- [ ] Update the migration landing page and documentation navigation when a new guide is added.
- [ ] Review module-baseline wording when artifact contents change.
- [ ] Review security “since version” notes when behavior changes.
- [ ] Review Java baseline, Javadocs, Maven Central, and release links if their targets change.

## Version numbers that are not the current library release

Do not bulk-replace these:

- `package.json` version: version of the website package, not Simple Java Mail.
- Migration filenames and copy for 5.0, 6.0, 7.0, and 9.0: historical documentation.
- Security notes such as “since 8.6.0”: historical behavior boundaries.
- Module notes such as “as of 9.0.0”: historical artifact changes.
- CLI dependency versions: versions of third-party CLI dependencies.
- SMTP replies such as `250 2.0.0 queued`: SMTP enhanced status codes, not software versions.
