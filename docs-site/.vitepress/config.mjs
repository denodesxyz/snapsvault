import { defineConfig } from 'vitepress';
import { writeLlmsFiles } from './llms.mjs';

const SITE = 'https://docs.snapsvault.xyz';
const OG_IMAGE = `${SITE}/og-image.jpg`;

const SIDEBAR = [
  {
    text: 'Learn',
    items: [
      { text: 'Introduction', link: '/overview/what-is-snapsvault' },
      { text: 'How it works', link: '/overview/how-it-works' },
      { text: 'Quickstart', link: '/overview/quickstart' },
      { text: 'Glossary', link: '/overview/glossary' },
    ],
  },
  {
    text: 'Use',
    items: [
      { text: 'Marketplace', link: '/core-components/marketplace' },
      { text: 'SnapsOS CLI', link: '/core-components/snapsos-cli' },
      { text: 'REST API', link: '/core-components/rest-api' },
    ],
  },
  {
    text: 'Contribute',
    items: [
      {
        text: 'Snapshots',
        link: '/contributing/list-your-snapshots',
        items: [
          { text: 'Feed format', link: '/contributing/feed-format' },
          { text: 'Registry file', link: '/contributing/registry-file' },
        ],
      },
      { text: 'Improvements', link: '/contributing/contribute' },
      { text: 'Feedback', link: '/contributing/feedback' },
    ],
  },
];

export default defineConfig({
  lang: 'en-US',
  title: 'SnapsVault',
  description: 'Open Snapshot Marketplace',

  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['legacy/**'],

  sitemap: { hostname: SITE },

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico', sizes: '16x16' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' }],
    ['meta', { property: 'og:site_name', content: 'SnapsVault Docs' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'en_US' }],
    ['meta', { property: 'og:image', content: OG_IMAGE }],
    ['meta', { property: 'og:image:width', content: '1200' }],
    ['meta', { property: 'og:image:height', content: '630' }],
    ['meta', { property: 'og:image:alt', content: 'SnapsVault' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:image', content: OG_IMAGE }],
  ],

  async buildEnd(siteConfig) {
    await writeLlmsFiles({
      srcDir: siteConfig.srcDir,
      outDir: siteConfig.outDir,
      site: SITE,
      title: 'SnapsVault Docs',
      description: 'SnapsVault is an open snapshot marketplace for node snapshots. Contributors publish their snapshots in one format, and node operators find, verify and download them in one place, through a web Marketplace, the SnapsOS CLI or a REST API.',
      sidebar: SIDEBAR,
    });
  },

  transformPageData(pageData, { siteConfig }) {
    if (pageData.isNotFound) return;
    const path = pageData.relativePath.replace(/(index)?\.md$/, '');
    const url = `${SITE}/${path}`;
    const title = `${pageData.title} | ${siteConfig.site.title}`;
    const description = pageData.description || siteConfig.site.description;
    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push(
      ['link', { rel: 'canonical', href: url }],
      ['meta', { property: 'og:url', content: url }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: description }],
    );
  },

  themeConfig: {
    logo: '/snapsvault-logo.svg',
    logoLink: '/overview/what-is-snapsvault',

    footer: {
      message: 'SnapsVault, Open Snapshot Marketplace',
      copyright:
        'Maintained by <a href="https://denodes.io" target="_blank">deNodes</a>',
    },

    nav: [
      { text: 'SnapsVault App', link: 'https://celestia.snapsvault.xyz/' },
      { text: 'Website', link: 'https://snapsvault.xyz' },
    ],

    sidebar: SIDEBAR,

    search: { provider: 'local' },

    outline: { level: [2, 3], label: 'On this page' },

    notFound: {
      title: 'Page not found',
      quote: 'This page does not exist or has moved.',
      linkLabel: 'Go to the introduction',
      linkText: 'Go to the introduction',
      link: '/overview/what-is-snapsvault',
      code: '404',
    },

    docFooter: {
      prev: 'Previous',
      next: 'Next',
    },
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
  },

  vite: {
    server: { hmr: { overlay: false } },
  },
});
