import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "xwihrxinweeadtcouhoo.supabase.co" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/paciente/materiais",
        has: [
          {
            type: "query",
            key: "arquivo",
            value: "(?<id>[0-9a-fA-F-]{36})",
          },
        ],
        destination: "/paciente/materiais/:id/arquivo",
      },
    ];
  },
  experimental: {
    serverActions: {
      // A área do paciente é acessada pelo domínio público e encaminhada
      // internamente para admin.nutrithales.com.br. O Next.js bloqueia Server
      // Actions quando Origin e x-forwarded-host divergem, a menos que o
      // domínio público esteja explicitamente autorizado.
      allowedOrigins: ["nutrithales.com.br", "www.nutrithales.com.br"],
    },
  },
  // Garante que os .otf da Galano sejam empacotados na função serverless
  // que exporta o PDF (src/lib/pdf/plano-alimentar.tsx lê os arquivos via
  // fs.readFileSync pro React-PDF, e esse acesso via fs não é rastreado
  // automaticamente pelo bundler como um `import` normal seria).
  outputFileTracingIncludes: {
    "/**": ["./src/fonts/*.otf"],
  },
};

export default nextConfig;
