// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import mdx from "@astrojs/mdx";

// https://astro.build/config
export default defineConfig({
  site: "https://randalthor17.github.io",
  // Only use base path in production (GitHub Pages)
  base: process.env.NODE_ENV === "production" ? "/astro-theme-terminal" : "/",
  integrations: [sitemap(), mdx()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
    shikiConfig: {
      theme: "css-variables",
      langs: [],
      wrap: true,
    },
  },
});

