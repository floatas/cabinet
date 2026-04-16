export interface RegistryTemplate {
  slug: string;
  name: string;
  description: string;
  domain: string;
  agentCount: number;
  jobCount: number;
  childCount: number;
}

export const REGISTRY_TEMPLATES: RegistryTemplate[] = [
  {
    slug: "saas-startup",
    name: "SaaS Startup",
    description:
      "B2B SaaS startup with product-led growth, engineering, and customer success teams.",
    domain: "Software",
    agentCount: 3,
    jobCount: 2,
    childCount: 0,
  },
  {
    slug: "agency",
    name: "Digital Agency",
    description:
      "Digital agency managing multiple client engagements with shared processes and templates.",
    domain: "Professional Services",
    agentCount: 2,
    jobCount: 2,
    childCount: 2,
  },
  {
    slug: "career-ops",
    name: "Career Ops",
    description:
      "AI-powered job search command center. Evaluate offers, scan company portals, generate ATS-optimized CVs, and track your pipeline.",
    domain: "Operations",
    agentCount: 10,
    jobCount: 5,
    childCount: 0,
  },
  {
    slug: "content-creator",
    name: "Content Creator",
    description:
      "Solo content creator operation with strategy, editing, and analytics workflows.",
    domain: "Media",
    agentCount: 3,
    jobCount: 2,
    childCount: 0,
  },
  {
    slug: "ecommerce",
    name: "E-commerce Store",
    description:
      "Direct-to-consumer e-commerce brand with inventory, email marketing, and fulfillment operations.",
    domain: "E-commerce",
    agentCount: 2,
    jobCount: 2,
    childCount: 0,
  },
  {
    slug: "job-hunt-hq",
    name: "Job Hunt HQ",
    description:
      "Job search is a full-time job. This cabinet staffs it with a career strategist, resume tailor, interview coach, and networking scout.",
    domain: "Operations",
    agentCount: 4,
    jobCount: 4,
    childCount: 0,
  },
  {
    slug: "real-estate",
    name: "Real Estate Brokerage",
    description:
      "Real estate brokerage with listings management, marketing, and client relationship operations.",
    domain: "Sales",
    agentCount: 2,
    jobCount: 2,
    childCount: 3,
  },
  {
    slug: "text-your-mom",
    name: "Text Your Mom",
    description:
      "Relatable B2C app company cabinet used to test nested cabinet behavior.",
    domain: "Software",
    agentCount: 4,
    jobCount: 3,
    childCount: 3,
  },
];
