# Article editorial workflow

Use this script to turn an outline or draft into a stronger starting point for the author's own editing. It works for personal essays, project histories, technical walkthroughs and case studies. The passes guide the editing process; they are not a template for the article's headings or plot.

Edit for the order in which a reader understands the subject. Accurate facts and useful examples can still arrive too early, demand too much attention or suggest the wrong emphasis. Each pass checks a different concern; factual verification alone cannot establish that the story or its visual presentation works.

## How to use it

Give the editor this file and the target article or outline. For example:

```text
Apply the article editorial workflow to <article or outline>.
Readers: <optional audience and assumed knowledge>.
Keep: <optional passages, opinions, jokes, images or stylistic choices>.
Technical context: <optional target version, checkout or primary sources>.
```

Applying this workflow means revising the supplied draft, or fleshing out the supplied outline, within its established intent. Make ordinary structural and clarity improvements directly. Leave consequential changes to the author's position, personal account or premise as proposals.

Follow the user's scope and any explicit instruction such as "report only, don't edit." No mode flag is needed. Infer missing context from the material where reasonable; ask only if an unresolved choice would materially change the article. Using this script does not itself authorize publishing, changing draft status, committing or pushing.

## Before the passes

Read the whole article before rewriting individual sentences. Read any supplied brief and the relevant project authoring instructions. If it belongs to a set, look at the neighbouring articles' purposes and relevant sections, not necessarily their entire source material.

Treat the author's latest wording and corrections as the source of intent. Check the current file and existing edits; an old outline or previous review may no longer describe it. Preserve concurrent work. Do not create backup copies or commits unless requested.

Distinguish recorded facts, personal recollection, opinion, inference and fiction. Never invent the author's motives, experiences, quotations or retrospective wisdom to complete an attractive story. An unresolved fact is a research question, not permission to fill it in.

## Pass 1: Establish the point and test the premise

Write a short working brief:

- Who is reading, and what can they already be expected to know?
- What question, tension or experience holds the article together?
- What makes the opening worth continuing?
- What should the reader understand or be able to do by the end?
- What belongs elsewhere, particularly in a neighbouring article?

If these answers are missing or contradictory, propose a direction before a substantial rewrite. An article need not teach a universal lesson; a personal account may be valuable for the experience or perspective itself.

Challenge the setting and the claimed value of the technology. Would an ordinary existing tool or infrastructure layer already solve the problem? What does the featured library or technique actually contribute, and what remains the application's or operator's job? Do not force a scenario to showcase a feature.

For fiction, establish credible actors, constraints and access. Keep illustrative incidents and measurements recognisably fictional. Do not give an actor unexplained powers to make the next section possible, or make competent people implausibly foolish. For history, verify consequential dates and causal claims before building the narrative around them.

Sanity-check numerical premises early. Work back from headline totals to the experience of one person or operation, distinguishing ordinary activity from exceptional bursts. If the author's experience challenges an assumption, investigate it before defending the arithmetic. Establish the actual difficulty the scenario creates; a large total alone does not explain the need for a particular solution.

## Pass 2: Repair the order of information

Map what each section introduces, what it assumes the reader already knows, and what it makes possible next. Reorder before rewriting extensively.

- Introduce a person, system, requirement or object before relying on it in an explanation.
- Establish the wider setting before narrowing to the part the article examines. Keep the relationship between the whole and the selected part clear in both prose and diagrams.
- Show the need for a decision before describing the mechanism chosen to address it.
- Keep an explanation's continuation beside it. Look for an unrelated paragraph inserted between the setup and its payoff.
- Check chronology separately from reading order. Flashbacks and thematic grouping are fine when the reader can place them; do not let a later capability quietly appear in an earlier setup.
- Check callbacks such as "that problem," "the record" or "remember the agreement." The antecedent must be clear and memorable, not a passing mention several pages earlier.
- Move or remove a sidebar if the following paragraphs or table depend on it. A passage is not an aside merely because it is technical.

Choose a progression that fits the article. A troubleshooting story may follow ordinary operation, symptoms, investigation and remedy. A design essay may follow a need, alternatives, trade-offs and a choice. A memoir may follow changing circumstances and the author's responses. Do not impose an incident-and-resolution plot on everything.

Where it helps, carry a few concrete examples, objects or experiences through successive sections. Each return should develop something the reader already understands. If a section has no connection to the established question or examples, reconsider its place before adding a transition to justify it.

Check local transitions, including across section headings: why does this sentence or paragraph follow the previous one? When moving from a requirement, classification or policy to a concrete example, carry the relevant requirement into the example's opening. Readers should understand why this particular person, request or event is worth following now. A heading such as "Follow one request" or a generic "Let's see what that looks like" does not establish that connection by itself.

Keep transitions understandable on their own. Read each heading and opening sentence without the preceding section: does it name the subject and the action or requirement, or rely on "that check," "those limits" or "this approach"? Repeat a precise noun or short qualifier when needed to preserve the connection without making the reader reconstruct it. Do not restate whole explanations or remove ordinary pronouns whose referents are clear within the same passage.

Before promising to return to a problem, check whether it belongs here yet. If the intervening sections do not help explain or resolve it, introduce it where the article is ready to address it. A forward link cannot repair premature placement; making the problem more dramatic can make the interruption worse. Let an overview complete its immediate job without previewing every complication.

Check the exit as carefully as the entrance. Show what the example establishes before moving on. When an important question does need to remain open, say where the article will return to it, with a forward link when useful. The later section should explicitly resume the same example and provide the promised follow-through. Do not abandon the example after describing its mechanics, or invent a resolution simply to close the section.

## Pass 3: Manage reading effort and keep useful connective prose

Merge adjacent paragraphs that are doing the same job. Trim repeated qualifications and conclusions, especially after an example has already demonstrated the point. Replace a long explanation with a small concrete example when that genuinely reduces the reader's work.

Look for long runs of explanation or unfamiliar concepts without a concrete reference point. Bullets can collect parallel points, a table can expose a comparison, and a sequence diagram can show an interaction. Choose the form that makes the material easiest to follow; do not impose a paragraph quota or a visual every few paragraphs. An oversized diagram can interrupt reading as much as a wall of prose.

Keep research proportionate in the article. Retain the assumptions and qualifications needed to understand a claim, and use links for supporting detail. The investigation may be much larger than the explanation readers need.

Give long sections subheadings at real changes of subject or task. Split a section when it asks the reader to hold several independent ideas at once. Do not add a heading to every paragraph or force equally sized sections.

Before cutting a sentence, identify its function: fact, opinion, transition, emphasis, humour or explanation. Personal judgment and flavour are not automatically redundant. A deliberate recurring idea across a series is not automatically duplication either; ask whether each return adds a different perspective.

Keep the ending proportionate. Let it deliver the promised outcome or reflection without reteaching the article. Link to a next article only when it genuinely continues the reader's question. Do not invent a triumphant conclusion or force a practical takeaway onto an unresolved experience.

## Pass 4: Make the examples usable and connected

Apply this pass where examples help; do not add code to an essay merely to make it look technical.

Each example should answer a question or demonstrate a decision established by the surrounding story. Introduce unfamiliar mechanisms through the need for them, and carry their consequences into later examples where relevant.

- Start with the smallest snippet that explains the immediate decision. Build towards a complete example when readers need the orchestration to use it safely. Keep the short snippets consistent with the final version.
- Put the reason for a lock, queue, callback, resource or configuration choice before or beside the code that introduces it.
- Explain consequences in configuration comments: what waits, what is rejected, what stays allocated, what a timeout covers, or what costs increase. Avoid comments that only repeat a method name.
- Where relevant, show what the application does next: handles rejection, retries, records an outcome, releases resources or shuts down. A setting alone may not be a recipe.
- Distinguish real library APIs from application helpers and pseudocode. Establish the important variables, types, dependencies and lifecycle without burying the lesson in boilerplate.
- Keep one coherent example world: names, identifiers, domains, units, timings, versions and resource assumptions must agree across prose, code, logs and diagrams.
- Include realistic unhappy paths when the lesson depends on them. Do not promise automatic recovery in prose when the example only flags a failure for investigation.
- Reuse established helpers and result handling in later examples. Avoid quietly bypassing an earlier safeguard when introducing another feature.
- Resist incidental frameworks, repair subsystems and defensive commentary that are not needed for this article's point.

Check for a useful missing demonstration: would a short log, configuration record, query, API call or test make an abstract explanation tangible? Add it only if it earns the space. Clearly distinguish simulated output from results actually observed.

## Pass 5: Verify facts, claims and references

Use the relevant primary evidence: current source and tests for implementation claims, pinned code for historical behaviour, original issues and messages for project history, and authoritative specifications for protocol claims. Match the evidence to the article's target version or period; do not modernise a deliberately historical example.

- Confirm signatures, return types, defaults, units and failure behaviour. Do not change production code to make an article's example correct.
- Audit numerical claims for counting units, populations, time windows and averages versus peaks. Reconcile totals and subsets across prose, examples and diagrams; do not add a subset again or silently apply one group's average to everyone.
- Distinguish measured figures from assumptions and model outputs. A source may substantiate the kind of workload without substantiating its fictional volume; make the role of the reference clear.
- Separate what a mechanism guarantees from what it merely enables, reports or requests. Separate an intermediate success from the final outcome readers may assume it means.
- For security topics, state which actor or component a control addresses and what remains exposed. Do not turn a local fix into a whole-system guarantee.
- Check that the prose, examples and diagrams make the same claim. Qualifiers should sit near the claim they qualify.
- Make link text express the supported claim and link to the relevant section, comment or revision when possible. A page that happens to mention the same topic is not necessarily evidence.
- Prefer a usable reader clickthrough. If an archive is broken or unusably slow, flag it or use an existing faithful local snapshot; do not silently rewrite quoted source material.
- If evidence is missing or conflicts with recollection, state the uncertainty and offer wording that reflects it. Never present inferred behaviour as a reproduced result.

Use internal documentation links to explain details without expanding every digression. A comparison with a related article should contrast a concrete decision under different constraints, not merely advertise the other article.

## Pass 6: Make the visuals explain something

Use a diagram, table, screenshot or illustration when it makes an important relationship easier to understand. Do not add visuals simply to break up text.

For technical diagrams, favour dependencies, collaboration, topology and resource contention. A compact historical or migration summary can work; a chain of boxes that merely retells the prose usually adds little.

Decide what each visual must establish at this point in the reading: the setting, an interaction, a detailed mechanism or a comparison. A company overview and a close-up of one service have different jobs even when they share nodes. Check that the chosen scope fits what the reader has learned so far.

- Introduce a neutral setup before overlaying a problem if the story depends on discovering it.
- Treat size, colour, position and grouping as claims about importance and relationships. Avoid presenting a small selected part as the whole system's main activity by accident. Prominence should serve the current explanation; it need not be proportional to a traffic count or headcount.
- In comparable diagrams, retain names, orientation and visual roles so the actual change is easy to spot.
- Show the relevant inputs and outputs, including distinct workloads when their differences matter.
- Redraw the whole system only when the whole system matters. Later diagrams can focus on the affected part.
- Use labels and annotations to explain the point that colour or arrows alone cannot carry. Do not imply a confirmed compromise when the diagram only shows exposure.
- Keep diagrams compact and legible, without unnecessary nested containers or one node per sentence. Adjust orientation, label widths and spacing together: shrinking the whole diagram can make cramped text even harder to read.

Use existing image and caption conventions. Keep alt text descriptive and distinct from the caption. Do not alter an author-supplied image unless that change is requested; flag substantive contradictions rather than silently retouching them.

## Pass 7: Give skimmers a micro-narrative

Read only the title, headings, images, diagrams, code blocks and captions, in their rendered order. Temporarily ignore the body prose.

Ask whether these elements still give a reader a shape of progression: what is happening, what changes, why the next example belongs here, and what the result is. For an essay this may be a progression of ideas or evidence, not a sequence of actions.

Include diagram labels in this reading. The abbreviated story should preserve the full article's scope and emphasis, not make a subset look like the whole or imply a stronger result than the prose supports.

Write captions that advance this abbreviated story. Express the action, consequence, discovery or contrast at that point, rather than merely naming the language, API or picture. For example:

- "Store the request before handing it to a worker."
- "When the work finishes, attach its outcome to the same record."

Together those captions communicate a lifecycle. Each remains short and points to something the adjacent example actually shows.

Do not make every caption follow the same verbal formula, add a caption to every object, or turn captions into extra explanatory paragraphs. Keep essential instructions in the body or code too. Captions help skimmers follow the story; they must not hide a safety requirement or claim an outcome the example cannot establish.

If the skim sequence is confusing, check the order of the blocks themselves before explaining around it. Captions can expose a structural mistake that fluent prose has concealed. Re-run the full reading pass after moving blocks.

## Pass 8: Preserve voice and finish the copy

Read the article as a conversation between the author and the intended reader. Preserve personal opinions, dry humour, fourth-wall breaks and deliberate changes of pace where they belong. Do not turn a personal note into marketing copy or a polished corporate explanation.

Use vocabulary the intended audience already understands. Familiar technical terms can be clearer than elaborate descriptive replacements. Explain genuine ambiguity where it matters; do not relabel a recognisable concept just to account for every adjacent possibility.

Look for language that makes the reader translate an abstraction before understanding the point. Words such as "boundaries," "ownership" and "compartments," repeated "not X but Y" constructions, grand generalisations and mechanical transitions are review candidates, not a blacklist. Inspect the full sentence and paragraph before proposing a change; replacing one abstraction with another is not an improvement.

Distinguish the author's opinion from telling the reader what conclusion to reach. Let examples earn their conclusions, but retain a personal judgment when it adds something. Check that a trimmed sentence was not the connective tissue holding the paragraph together.

Fix clear typos, duplicated words, inconsistent names and genuinely unclear pronouns. Preserve the author's punctuation and rhythm unless broader copyediting was requested. Treat an em-dash scan as a way to find candidates, not an instruction to replace every dash or restyle the author's sentences.

Check the title, description and any banner against the article as it now stands. They should accurately set expectations. A first-person banner or plot summary can be intentional; do not flatten it into a generic disclaimer. Keep the same terms throughout, especially where a familiar word has a competing technical meaning.

## Pass 9: Check the rendered reading experience

Use the project's existing preview and validation workflow. Do not assume that valid Markdown or passing tests proves the reading experience is sound.

- Inspect heading hierarchy, code wrapping or scrolling, tables, diagram labels, image alignment and navigation at desktop and narrow widths.
- Judge diagram height, line wrapping, arrow-label clearance and visual emphasis in the rendered page. A syntactically valid diagram may still require excessive scrolling or visually misrepresent its subject.
- Check that captions stay visually attached to the correct block, with sensible size, alignment and spacing.
- Look for accidental HTML nesting, overly wide or narrow content, empty table backgrounds and dividers or callouts that consume disproportionate space.
- Check internal URLs and anchors, image paths, alt text and the important source links.
- Compile or run examples in an isolated, appropriate environment where practical. Clearly separate library APIs from any application stubs used for compilation. Do not send real messages or perform external writes merely to validate an example.
- Report what was actually checked. A compilation check is not a runtime test; a source inspection is not a reproduced bug.

When a separate authoring preview matters to the workflow, check it where practical and report rendering differences. A good result in the published site does not prove that the editor's preview works, or vice versa.

Keep changes scoped to the article and authorised supporting files. If a problem needs a site-wide style or build change, report it separately unless that work was requested. Do not disrupt an existing preview to run a conflicting build.

## Final reread and handoff

Read the whole result once more for flow, consistency and preserved voice. Then repeat the skim-only pass. Repair regressions introduced by the editing, but stop after a coherent baseline; leave meaningful author choices visible rather than polishing indefinitely.

After moving or materially changing a block, reread its lead-in and continuation and recheck any affected examples, references or captions. A local improvement can disconnect the surrounding section. Repeat the affected checks rather than assuming an earlier pass still covers the revised material.

Return:

1. A one-sentence account of the article's spine.
2. A short summary of the substantive changes.
3. The actual skim sequence, using its headings or captions, and any remaining gap.
4. Only the remaining questions that need author judgment, with enough surrounding wording to understand each proposal.
5. Verification performed and anything not verified.

The deliverable is a better draft for the author to work with, not a claim that the article is finished or ready to publish.
