# Field guides

Put scenario-based reference material here, not in the personal Engineering Journal. Guides use the site's shared Markdown features (heading anchors, code captions and code copying), with a dedicated lookup-directory layout and stylesheet.

`email-workloads.md` is the initial workload guide. Its adjacent `email-workloads.11tydata.json` supplies the directory groups and scenario targets. Each group title must match a Markdown H2 and each scenario title a Markdown H3 so directory links resolve. Keep all group and scenario IDs unique. The side navigation lists only top-level groups; the opening directory is the detailed scenario lookup. The shared layout generates a local scenario index beneath each H2 from that same metadata, so authors don't maintain a second set of links. These generated indexes appear on the website, not in Typora's source preview.

Give a scenario its own concrete situation, measurable target, smallest useful design and relevant API calls. Link the applicable reference sections within each entry, since readers can enter anywhere. Keep a failure check when it exposes something non-obvious; don't append a formulaic exercise that simply repeats the target. Distinguish application code from Simple Java Mail configuration and SMTP-service policy. Use captions to make the examples' progression legible when scanning. Do not require readers to follow a fictional company or read all previous entries.

Use `draft: true` while developing a guide. Shared article policy hides drafts in production but includes them in preview. The Use cases and documentation links follow the generated `fieldGuides` collection, so an unpublished guide does not leave a broken production entry point. Guides are not Journal entries, case studies or members of their feeds.

The Docs dropdown and documentation sidebar place visible field guides immediately after Use cases. Set an optional `navigationTitle` for a concise task-oriented menu label; the article title remains unchanged. Both menus use the published/preview collection, so draft links disappear with their pages in production.

Downloadable examples belong in `src/assets/guides/<guide>/`. Keep their methods and usage contracts synchronized with the visible code. Compile against the API being demonstrated; compilation is not proof of SMTP behavior. Use authorized local fixtures for runtime checks and send no real mail during website verification.
