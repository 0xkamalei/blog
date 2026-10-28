/**
 * 知识库加载器
 *
 * 约定：把任何「自带完整样式」的独立 HTML 页面丢进 `src/knowledge/`，
 * 构建时会自动出现在 /knowledge 列表里，并生成 /knowledge/<文件名>/ 页面。
 *
 * 侧车（可选）：`src/knowledge/<同名>.meta.json`，可覆盖标题、摘要、标签、日期。
 *
 * 渲染方式：声明式 Shadow DOM（<template shadowrootmode="open">）。
 * 这样页面里 `* { margin:0; padding:0 }` 之类的全局重置只会作用于它自己的
 * shadow tree，不会污染博客的全局样式；同时又是服务端直出，无需 JS。
 */
export interface KnowledgeEntry {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  tags: string[];
  date: Date | null;
  /** 用于排序，越小越靠前 */
  order: number;
  /** 可直接 set:html 的 <template shadowrootmode="open"> 片段 */
  shadowHtml: string;
}

interface KnowledgeMeta {
  title?: string;
  description?: string;
  tags?: string[];
  date?: string;
  order?: number;
  draft?: boolean;
}

const rawFiles = import.meta.glob('../knowledge/*.html', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const metaFiles = import.meta.glob('../knowledge/*.meta.json', {
  eager: true,
  import: 'default',
}) as Record<string, KnowledgeMeta>;

const slugOf = (path: string) =>
  path
    .split('/')
    .pop()!
    .replace(/\.html$/i, '');

const stripTags = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * 源码里的 `html` / `body { ... }` 在 shadow tree 中不会命中任何元素，
 * 把它们提升成 `.kb-root`，以保留背景色 / 字体 / 内边距等视觉基调。
 */
function hoistBodyRule(css: string): string {
  const decls = [...css.matchAll(/(?:^|[\s}])(?:html|body)\s*\{([^}]*)\}/gi)]
    .map((m) => m[1])
    .join(';');

  const cleaned = decls
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    // min-height:100vh 之类在嵌入式场景里会撑出大片空白
    .filter((d) => !/^(min-height|height|min-width|width)\s*:/i.test(d))
    .join('; ');

  return cleaned ? `.kb-root { ${cleaned} }` : '.kb-root { min-height: 0 }';
}

function buildShadowHtml(inner: string, css: string): string {
  // 避免样式内容里的 </style> 提前闭合标签
  const safeCss = css.replace(/<\/style/gi, '<\\/style');

  const scoped = `:host { display: block; } ${hoistBodyRule(css)} ${safeCss}`;

  return [
    '<template shadowrootmode="open">',
    `<style>${scoped}</style>`,
    `<div class="kb-root">${inner}</div>`,
    '</template>',
  ].join('');
}

function parse(slug: string, html: string, meta: KnowledgeMeta): KnowledgeEntry {
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const css = styleBlocks.join('\n');

  const bodyMatch = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  const inner = (bodyMatch ? bodyMatch[1] : html).replace(
    /<style[^>]*>[\s\S]*?<\/style>/gi,
    ''
  );

  const rawTitle =
    /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim() ?? slug;

  const subtitle =
    /<p[^>]*class="[^"]*subtitle[^"]*"[^>]*>([\s\S]*?)<\/p>/i.exec(inner)?.[1] ?? '';
  const metaDesc =
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i.exec(html)?.[1] ?? '';

  const title = meta.title?.trim() || stripTags(rawTitle);
  const description = meta.description?.trim() || stripTags(metaDesc || subtitle);
  const plain = stripTags(inner);

  return {
    slug,
    title,
    description,
    excerpt: plain.length > 140 ? plain.slice(0, 140) + '…' : plain,
    tags: meta.tags ?? [],
    date: meta.date ? new Date(meta.date) : null,
    order: meta.order ?? 0,
    shadowHtml: buildShadowHtml(inner, css),
  };
}

function loadAll(): KnowledgeEntry[] {
  return Object.entries(rawFiles)
    .filter(([path]) => !path.split('/').pop()!.startsWith('_'))
    .map(([path, html]) => {
      const slug = slugOf(path);
      const meta =
        metaFiles[`../knowledge/${slug}.meta.json`] ?? metaFiles[path.replace(/\.html$/i, '.meta.json')] ?? {};
      return { slug, html, meta };
    })
    .filter(({ meta }) => meta.draft !== true)
    .map(({ slug, html, meta }) => parse(slug, html, meta))
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      const at = a.date?.valueOf() ?? 0;
      const bt = b.date?.valueOf() ?? 0;
      if (bt !== at) return bt - at;
      return a.title.localeCompare(b.title, 'zh-CN');
    });
}

let cache: KnowledgeEntry[] | null = null;

export function getKnowledgeEntries(): KnowledgeEntry[] {
  if (!cache) cache = loadAll();
  return cache;
}

export function getKnowledgeEntry(slug: string): KnowledgeEntry | undefined {
  return getKnowledgeEntries().find((e) => e.slug === slug);
}
