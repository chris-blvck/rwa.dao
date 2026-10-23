import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  { ignores: [".next/**", ".open-next/**", ".wrangler/**", "next-env.d.ts"] },
  { rules: {
    "react/no-unescaped-entities": "off",
    "@next/next/no-img-element": "warn",
    // Existing hydration effects and event callbacks are not compiled by React Compiler.
    // Keep these new compiler recommendations advisory during the runtime migration.
    "react-hooks/set-state-in-effect": "warn",
    "react-hooks/purity": "warn",
  } },
];

export default config;
