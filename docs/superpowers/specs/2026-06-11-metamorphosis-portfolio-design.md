# Metamorphosis — Portfolio Design Spec

**Date:** 2026-06-11
**Owner:** Manu Rathan Setty
**Status:** Approved (theme A2 "Particle Metamorphosis" + frosted-glass content cards)

## Concept

One continuous dark scene (near-black indigo `#040308`) where a single ~50,000-particle
GPU swarm is the protagonist. The swarm morphs into a recognizable shape per section,
driven by scroll. Content lives on frosted-glass cards floating over the scene, backlit
by the swarm's glow. Illuminated, alive, zero pre-made 3D assets — everything procedural.

**Positioning:** "Full-Stack & AI Engineer" — AI/agent work at Pageloop leads the story.
Sub-line: "I build agentic AI systems and production web apps."

## Visual identity

- **Palette:** indigo/violet core (`#818cf8` → `#c084fc`), cyan accents (`#67e8f9`),
  white-hot particle highlights, background `#040308`.
- **Typography:** Space Grotesk (display) + Inter (body). Type stays disciplined;
  particles provide the drama.
- **Glass cards:** `rgba(255,255,255,0.05)` fill, 1px `rgba(255,255,255,0.16)` border,
  backdrop blur, backlit glow matching nearest particle cluster.

## Morph map (scroll-driven)

| # | Section | Particle shape | Content |
|---|---------|----------------|---------|
| 1 | Hero | Anatomical brain (noise-deformed sphere, two hemispheres, folds), breathing, cursor-reactive | Name, "Full-Stack & AI Engineer", agentic sub-line, CTA |
| 2 | About + Skills | Branching neuron tree | Skill clusters: AI/Agents (PydanticAI, Claude SDK, MCP, LLM pipelines), Full-Stack (TS, React, Next.js, Remix, Angular, Node), ML (BKT/DKT, TF.js, Python), Data (PostgreSQL, MongoDB, Supabase) |
| 3 | Experience | Globe with continents, Bengaluru pulsing | Pageloop (Junior SWE, Oct 2025–present: AI agents, PydanticAI, MCP, multi-integration pipelines, HITL) → WhatsLoan (Trainee→ASE, Jan–Oct 2025: MEAN, PII/encryption compliance) |
| 4 | Projects | **Swarm splits into orbiting clusters — one orb per project.** Active project's cluster drifts forward + brightens behind its card; others dim. | Text-agent pipeline (Zendesk/Intercom/Jira/Salesforce/Slack, HITL), QA Dashboard + Claude SDK chatbot (hackathon), Math Village adaptive learning (BKT/DKT, TF.js), Wildlife Intrusion Detection (CV + sensors), Sanskaar Montessori (freelance, Vercel) |
| 5 | Contact | Name assembling letter by letter | Email, GitHub, LinkedIn, resume download |

Explicitly rejected shapes: `{ }` braces (cliché), plain sphere, generic dot-line network.

## Interaction model

- **Morphs:** curl-noise flocking between shapes (smoke/starlings mid-morph, then snap
  to crisp form). Per-particle random delay so morphs ripple.
- **At rest:** per-particle shimmer, micro-orbit, twinkle ("made of fireflies").
- **Cursor:** repulsion field — particles scatter like fish, swarm back home.
- **Click/tap:** shockwave burst from point + light flash.
- **Scroll:** scrubs the metamorphosis (Lenis smooth scroll); user controls the morph.
- **Mobile:** touch scatter, ~15k particles, no gyroscope.

## Stack

- Vite + TypeScript + vanilla Three.js (no React — lean bundle for single-page 3D).
- GPGPU particle simulation (position/velocity in float textures, custom shaders).
- Shape targets generated procedurally: noise-deformed sphere (brain), L-system-ish
  branches (neuron tree), point-sampled sphere + continent mask (globe), cluster
  centroids (project satellites), text geometry sampling (name).
- Lenis smooth scroll; UnrealBloom (or custom additive glow) post-processing.
- Content is real DOM text over the canvas — SEO-readable, copy-pastable.

## Performance & accessibility

- 60fps target; adaptive particle count by device (50k desktop / 15k mobile).
- `prefers-reduced-motion`: static illuminated layout, same content.
- No-WebGL fallback: same static layout.
- Semantic HTML, keyboard navigable, WCAG-conscious contrast on all text.

## Content decisions

- drsomasharan.in omitted (user request). Sanskaar Montessori is the freelance highlight.
- Title is "AI Engineer" not "AI Agent Engineer" (industry-standard, doesn't date itself).
- Skills sourced from resume + actual recent work (PydanticAI, Claude SDK, MCP, FastAPI,
  Remix, Vercel, TF.js) — resume is outdated; portfolio leads with current reality.

## Deployment

- Static build. Target: replace manurathansetty.github.io (keeps resume URL working).
- **Gate:** user reviews the local product before anything is pushed live.

## Out of scope

- Blog, CMS, contact form backend (mailto + links only), analytics, i18n.
