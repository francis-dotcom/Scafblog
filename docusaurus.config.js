import { themes as prismThemes } from "prism-react-renderer";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "SCAFBLOG",
  tagline: "Spiraling into deeper technology insights",
  favicon: "img/favicon.ico",

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: "https://scafblog.com",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "francis-dotcom", // Your GitHub username
  projectName: "Scafblog", // Your repo name

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  // ADD THIS PLUGINS SECTION
  plugins: [
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "get-trained",
        path: "get-trained",
        routeBasePath: "get-trained",
        sidebarPath: "./sidebars.js",
        // editUrl: 'https://github.com/francis-dotcom/Scafblog/edit/main/',
      },
    ],
  ],

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: "./sidebars.js",
          // editUrl: "https://github.com/francis-dotcom/Scafblog/edit/main/",
        },
        blog: {
          showReadingTime: true,
          blogSidebarCount: "ALL",
          feedOptions: {
            type: ["rss", "atom"],
            xslt: true,
          },
          // editUrl: "https://github.com/francis-dotcom/Scafblog/edit/main/",
          // Useful options to enforce blogging best practices
          onInlineTags: "warn",
          onInlineAuthors: "warn",
          onUntruncatedBlogPosts: "warn",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: "img/docusaurus-social-card.jpg",
      navbar: {
        title: "Scafblog",
        logo: {
          alt: "ScafBlog Logo",
          src: "img/logo.svg",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "tutorialSidebar",
            position: "left",
            label: "Tutorial",
          },
          { to: "/blog", label: "Blog", position: "left" },
          // ADD THIS NEW NAVBAR ITEM
          {
            type: "docSidebar",
            sidebarId: "getTrainedSidebar",
            position: "left",
            label: "Get Trained",
            docsPluginId: "get-trained",
          },
          {
            href: "https://github.com/francis-dotcom/Scafblog",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Docs",
            items: [
              {
                label: "Tutorial",
                to: "/docs/intro",
              },
              // ADD GET TRAINED TO FOOTER TOO
              {
                label: "Get Trained",
                to: "/get-trained",
              },
            ],
          },
          {
            title: "Community",
            items: [
              {
                label: "Stack Overflow",
                href: "https://stackoverflow.com/questions/tagged/scafblog",
              },
              {
                label: "Discord",
                href: "https://discord.gg/scafblog",
              },
              {
                label: "X",
                href: "https://x.com/francistech",
              },
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "Blog",
                to: "/blog",
              },
              {
                label: "GitHub",
                href: "https://github.com/francis-dotcom/Scafblog",
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()}. ScafBlog. Built by CYQUADTECH with Docusaurus .`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),
};

export default config;
