import type { NextConfig } from "next";

const supabaseHostname = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : undefined;
  } catch {
    return undefined;
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHostname
      ? [{ protocol: "https", hostname: supabaseHostname }]
      : [],
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
