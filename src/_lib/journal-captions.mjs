function mediaEnd(tokens, index) {
  const token = tokens[index];
  if (token.level !== 0) return null;
  if (token.type === "fence") return index + 1;
  if (token.type === "html_block" && /^\s*<img\b(?:[^<>"']|"[^"]*"|'[^']*')*\/?>\s*$/iu.test(token.content)) return index + 1;
  if (token.type === "paragraph_open"
      && tokens[index + 1]?.type === "inline"
      && tokens[index + 1].children?.length === 1
      && tokens[index + 1].children[0].type === "image"
      && tokens[index + 2]?.type === "paragraph_close") return index + 3;
  return null;
}

function captionContent(tokens, index) {
  if (tokens[index]?.type !== "paragraph_open"
      || tokens[index].level !== 0
      || tokens[index + 1]?.type !== "inline"
      || tokens[index + 2]?.type !== "paragraph_close") return null;
  const children = tokens[index + 1].children;
  if (children?.[0]?.type !== "em_open" || children.at(-1)?.type !== "em_close") return null;
  // Only one enclosing emphasis counts; mixed prose such as '*one* and *two*' does not.
  const content = children.slice(1, -1);
  return content.some((token) => token.level === 0) ? null : content;
}

export function journalCaptions(markdown) {
  markdown.core.ruler.after("inline", "journal-captions", (state) => {
    const tokens = state.tokens;
    for (let index = 0; index < tokens.length; index += 1) {
      const end = mediaEnd(tokens, index);
      if (end === null) continue;
      const content = captionContent(tokens, end);
      if (!content) continue;

      const open = new state.Token("figure_open", "figure", 1);
      open.block = true;
      open.attrSet("class", "journal-captioned");
      if (tokens[index].type === "fence" && tokens[index].info.trim().split(/\s+/u, 1)[0] === "mermaid") {
        open.attrJoin("class", "journal-diagram");
        open.attrSet("data-pagefind-ignore", "");
        tokens[index].meta = { ...tokens[index].meta, journalCaptioned: true };
      }
      const close = new state.Token("figure_close", "figure", -1);
      close.block = true;

      if (tokens[index].type === "paragraph_open") {
        tokens[index].hidden = true;
        tokens[end - 1].hidden = true;
      }
      tokens[end].type = "figcaption_open";
      tokens[end].tag = "figcaption";
      tokens[end + 1].children = content;
      for (const child of content) child.level -= 1;
      tokens[end + 2].type = "figcaption_close";
      tokens[end + 2].tag = "figcaption";

      const figure = tokens.slice(index, end + 3);
      for (const token of figure) token.level += 1;
      tokens.splice(index, figure.length, open, ...figure, close);
      index = end + 4;
    }
  });
}
