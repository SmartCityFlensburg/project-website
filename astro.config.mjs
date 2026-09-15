import { defineConfig, envField, fontProviders } from 'astro/config'
import react from '@astrojs/react'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'
import pkg from './package.json' with { type: 'json' }

function safeCommand(cmd) {
  try {
    return execSync(cmd).toString().trim()
  } catch {
    return null
  }
}

// astro:env only sees variables that exist when the config is loaded, so the
// git-derived default has to be computed here.
process.env.APP_VERSION ??= safeCommand('git describe --tags --always') ?? pkg.version ?? 'develop'

function localFont(name, cssVariable, files) {
  return {
    provider: fontProviders.local(),
    name,
    cssVariable,
    options: {
      variants: Object.entries(files).map(([weight, file]) => ({
        weight: Number(weight),
        style: 'normal',
        display: 'swap',
        src: [`./src/assets/fonts/${file}`],
      })),
    },
  }
}

export default defineConfig({
  site: 'https://green-ecolution.de',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  env: {
    schema: {
      APP_VERSION: envField.string({ context: 'server', access: 'public' }),
      // Build-time fallback only. nginx overrides it at serve time through
      // window._env_, see src/lib/runtimeEnv.ts.
      VIDEO_BASE_URL: envField.string({ context: 'client', access: 'public', optional: true }),
      // Press downloads are plain links, so unlike the videos they need no
      // runtime override: swapping a file in the bucket is enough.
      ASSET_BASE_URL: envField.string({
        context: 'server',
        access: 'public',
        default: 'https://green-ecolution-public-videos.s3.de.io.cloud.ovh.net',
      }),
    },
  },
  fonts: [
    localFont('Lato', '--font-lato-face', {
      300: 'lato-300.woff2',
      400: 'lato-400.woff2',
      600: 'lato-600.woff2',
      700: 'lato-700.woff2',
    }),
    localFont('Nunito Sans', '--font-nunito-sans-face', {
      400: 'nunito-sans-400.woff2',
      500: 'nunito-sans-500.woff2',
      600: 'nunito-sans-600.woff2',
      700: 'nunito-sans-700.woff2',
    }),
  ],
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en'],
    routing: { prefixDefaultLocale: true },
  },
  // Order matters: the framework integration has to come before mdx() so MDX
  // inherits the configured JSX runtime. This is what `astro add react mdx` emits.
  integrations: [
    react(),
    mdx(),
    sitemap({
      // The root page only redirects and is marked noindex; listing it next to
      // the pages it points to would hand crawlers a duplicate. The showcase is
      // a booth loop, not a page of the site.
      filter: (page) => {
        const { pathname } = new URL(page)
        return pathname !== '/' && !pathname.endsWith('/showcase')
      },
      i18n: { defaultLocale: 'de', locales: { de: 'de-DE', en: 'en-GB' } },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        // vite resolves this package's browser field to a UMD bundle whose default
        // export is the CJS exports object, so <Lottie /> would receive an object.
        'lottie-react': 'lottie-react/build/index.es.js',
      },
    },
    server: {
      watch: {
        // chokidar follows .direnv/flake-inputs into the nix store and burns ~140k
        // inotify watches on the nixpkgs tree, which kills the dev server with ENOSPC.
        ignored: ['**/.direnv/**'],
      },
      proxy: {
        // The bucket answers CORS only for the production origin, so hls.js
        // cannot fetch from localhost; dev serves the videos same-origin instead.
        '/project-video': {
          target: 'https://green-ecolution-public-videos.s3.de.io.cloud.ovh.net',
          changeOrigin: true,
        },
        '/blog-video': {
          target: 'https://green-ecolution-public-videos.s3.de.io.cloud.ovh.net',
          changeOrigin: true,
        },
      },
    },
  },
})
