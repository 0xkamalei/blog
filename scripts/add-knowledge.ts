/**
 * 收录一篇知识库页面
 *
 *   bun run kb:add ../some-dir/diagram.html
 *   bun run kb:add ./x.html --slug kafka-outbox --tags 分布式,Kafka --date 2026-10-28
 *
 * 做的事情：
 *   1. 把 HTML 复制到 src/knowledge/<slug>.html
 *   2. 从 <title> / meta[description] / .subtitle 里抽出标题和摘要
 *   3. 生成 src/knowledge/<slug>.meta.json（已存在则保留）
 */
import { copyFile, writeFile, access } from 'node:fs/promises';
import { basename, extname, resolve, join } from 'node:path';

const KB_DIR = resolve(import.meta.dir, '../src/knowledge');

const argv = process.argv.slice(2);
const flags = new Map<string, string>();
const positional: string[] = [];

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg.startsWith('--')) {
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      flags.set(key, next);
      i++;
    } else {
      flags.set(key, 'true');
    }
  } else {
    positional.push(arg);
  }
}

const input = positional[0];
if (!input) {
  console.error('用法: bun run kb:add <path/to/page.html> [--slug name] [--tags a,b] [--date 2026-10-28]');
  process.exit(1);
}

const src = resolve(input);
const html = await Bun.file(src).text();

const slug =
  flags.get('slug') ||
  basename(src, extname(src))
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-|-$/g, '');

const strip = (s: string) =>
  s
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const title = strip(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '') || slug;
const description =
  strip(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1] ??
      /<p[^>]*class="[^"]*subtitle[^"]*"[^>]*>([\s\S]*?)<\/p>/i.exec(html)?.[1] ??
      ''
  ).slice(0, 160);

const targetHtml = join(KB_DIR, `${slug}.html`);
const targetMeta = join(KB_DIR, `${slug}.meta.json`);

await copyFile(src, targetHtml);

let metaExists = true;
try {
  await access(targetMeta);
} catch {
  metaExists = false;
}

if (!metaExists) {
  const today = new Date().toISOString().slice(0, 10);
  const meta = {
    title,
    description,
    tags: (flags.get('tags') ?? '').split(',').map((t) => t.trim()).filter(Boolean),
    date: flags.get('date') ?? today,
  };
  await writeFile(targetMeta, JSON.stringify(meta, null, 2) + '\n', 'utf8');
}

console.log(`✓ src/knowledge/${slug}.html`);
console.log(`  → /knowledge/${slug}/`);
if (!metaExists) console.log(`✓ src/knowledge/${slug}.meta.json（可编辑标题 / 摘要 / 标签）`);
