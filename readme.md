# My Blog

This blog has been migrated from Hugo to [Astro](https://astro.build/).

## 🚀 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `bun install`             | Installs dependencies                            |
| `bun run dev`             | Starts local dev server at `localhost:4321`      |
| `bun run build`           | Build your production site to `./dist/`          |
| `bun run preview`         | Preview your build locally, before deploying     |
| `bun astro ...`           | Run CLI commands like `astro add`, `astro check` |
| `bun astro --help`        | Get help using the Astro CLI                     |
| `bun run kb:add <file>`   | Add an HTML knowledge page to `src/knowledge/`    |

## 📁 Project Structure

- `src/content/blog/`: Blog posts in Markdown format.
- `src/knowledge/`: Knowledge-base pages as standalone HTML files.
- `src/pages/`: Individual pages and dynamic routes.
- `src/layouts/`: Common page layouts.
- `public/`: Static assets like images and favicons.

## 📚 知识库

站点导航分三块：**文章**(`/`) · **知识**(`/knowledge/`) · **关于**(leix.dev)。
「知识」用来放自带完整样式的独立 HTML 页面（架构图、时序图、可视化笔记等）。

收录一篇：

```bash
bun run kb:add /path/to/diagram.html
# 或者手动：把文件复制到 src/knowledge/<slug>.html 即可
```

- 文件名即 URL：`src/knowledge/outbox-end-to-end-sequenced.html` → `/knowledge/outbox-end-to-end-sequenced/`
- 可选侧车文件 `src/knowledge/<slug>.meta.json` 覆盖标题 / 摘要 / 标签 / 日期：
  ```json
  { "title": "...", "description": "...", "tags": ["分布式"], "date": "2026-10-28", "order": 0 }
  ```
- 以 `_` 开头的文件会被忽略（可放草稿）。

渲染方式：`src/lib/knowledge.ts` 在构建期把 HTML 拆成 `<style>` + body，
再用**声明式 Shadow DOM**（`<template shadowrootmode="open">`）嵌进页面。
所以这类页面的全局样式（`* { margin:0 }`、`body { background:#020617 }`）只作用于它自己，
不会污染博客主题；同时是服务端直出，无 JS。

注意：Shadow DOM 内的 `<script>` 不会执行。如果页面需要交互，
请把逻辑写成博客侧的 Astro 组件，或在页面里手动 `attachShadow` 后 clone。

