import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

/** Domínio público usado quando VITE_SITE_URL não está definido. */
const SITE_PADRAO = 'https://gestao-atendimentos-web.vercel.app';

/**
 * SEO no build: preenche %SITE_URL%, %LASTMOD% e %GOOGLE_SITE_VERIFICATION% no index.html
 * e nos arquivos públicos (robots, sitemap, llms.txt, manifest), para que tudo saia com o
 * domínio real configurado na Vercel. Sem código do Search Console, a meta é removida.
 */
function seo(env: Record<string, string>): Plugin {
  const site = (env.VITE_SITE_URL || SITE_PADRAO).replace(/\/$/, '');
  const verificacao = env.VITE_GOOGLE_SITE_VERIFICATION ?? '';
  const hoje = new Date().toISOString().slice(0, 10);
  const preencher = (txt: string) => txt.replaceAll('%SITE_URL%', site).replaceAll('%LASTMOD%', hoje).replaceAll('%GOOGLE_SITE_VERIFICATION%', verificacao);
  let outDir = 'dist';
  return {
    name: 'seo-dominio',
    configResolved: (c) => {
      outDir = c.build.outDir;
    },
    transformIndexHtml: (html) => {
      const semVerificacao = verificacao ? html : html.replace(/\s*<meta name="google-site-verification"[^>]*>/, '');
      return preencher(semVerificacao);
    },
    closeBundle: () => {
      for (const f of ['robots.txt', 'sitemap.xml', 'llms.txt', 'site.webmanifest']) {
        const p = join(outDir, f);
        if (existsSync(p)) writeFileSync(p, preencher(readFileSync(p, 'utf8')));
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    plugins: [react(), seo(env)],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: { port: 5173 },
    css: { preprocessorOptions: { scss: { api: 'modern-compiler' } } },
    build: {
      target: 'es2022',
      chunkSizeWarningLimit: 900,
    },
  };
});
