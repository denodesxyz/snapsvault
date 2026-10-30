// Writes llms.txt, llms-full.txt and a Markdown copy of every sidebar page into the build output,
// so an LLM or agent can read the docs as plain text (https://llmstxt.org).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

function sidebarPages(sidebar) {
  const groups = [];
  const walk = (items, pages) => {
    for (const item of items) {
      if (item.link) pages.push({ text: item.text, link: item.link });
      if (item.items) walk(item.items, pages);
    }
  };
  for (const group of sidebar) {
    const pages = [];
    walk(group.items ?? [], pages);
    groups.push({ text: group.text, pages });
  }
  return groups;
}

function splitFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { data: {}, body: source };
  const data = {};
  for (const line of match[1].split('\n')) {
    const field = line.match(/^(\w+):\s*(.*)$/);
    if (field) data[field[1]] = field[2].replace(/^['"]|['"]$/g, '');
  }
  return { data, body: source.slice(match[0].length) };
}

// Site-relative links become absolute, and layout-only HTML wrappers are dropped.
function plainMarkdown(body, site) {
  return body
    .replace(/\]\((\/[^)\s]*)\)/g, (_, path) => `](${site}${path})`)
    .replace(/^<\/?div[^>]*>\n/gm, '')
    .trim();
}

export async function writeLlmsFiles({ srcDir, outDir, site, title, description, sidebar }) {
  const index = [`# ${title}`, '', `> ${description}`, ''];
  const full = [`# ${title}`, '', `> ${description}`, ''];

  for (const group of sidebarPages(sidebar)) {
    index.push(`## ${group.text}`, '');
    for (const page of group.pages) {
      const source = await readFile(join(srcDir, `${page.link}.md`), 'utf8');
      const { data, body } = splitFrontmatter(source);
      const markdown = plainMarkdown(body, site);
      const mdPath = `${page.link}.md`;

      await mkdir(dirname(join(outDir, mdPath)), { recursive: true });
      await writeFile(join(outDir, mdPath), `${markdown}\n`);

      index.push(`- [${page.text}](${site}${mdPath})${data.description ? `: ${data.description}` : ''}`);
      full.push('---', '', `Source: ${site}${page.link}`, '', markdown, '');
    }
    index.push('');
  }

  await writeFile(join(outDir, 'llms.txt'), `${index.join('\n').trim()}\n`);
  await writeFile(join(outDir, 'llms-full.txt'), `${full.join('\n').trim()}\n`);
}
