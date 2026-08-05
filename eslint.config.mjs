import nextPlugin from "@next/eslint-plugin-next";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/**
 * Hand-rolled flat config: `eslint-config-next`'s legacy shareable config
 * currently trips `@eslint/eslintrc`'s FlatCompat validator on a circular
 * self-reference inside eslint-plugin-react's own flat export, so we
 * consume the Next.js and TypeScript rule sets directly instead of going
 * through that shim.
 */
export default tseslint.config(
  { ignores: [".next/**", "node_modules/**"] },
  {
    plugins: { "@next/next": nextPlugin, "react-hooks": reactHooksPlugin },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
      ...reactHooksPlugin.configs.recommended.rules,
    },
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // Flags the standard "reset local form state when a prop changes"
      // pattern used across every modal in this app; too aggressive for
      // that idiomatic case as of eslint-plugin-react-hooks v7.1.
      "react-hooks/set-state-in-effect": "off",
    },
  },
);
