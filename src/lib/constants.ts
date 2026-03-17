export const HEADSHOT_STYLES = [
  { slug: "professional", label: "Professional", description: "Clean, corporate headshot" },
  { slug: "creative", label: "Creative", description: "Artistic and expressive" },
  { slug: "casual", label: "Casual", description: "Friendly and approachable" },
] as const;

export type StyleSlug = (typeof HEADSHOT_STYLES)[number]["slug"];
