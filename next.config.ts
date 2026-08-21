import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "xwihrxinweeadtcouhoo.supabase.co" },
    ],
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
