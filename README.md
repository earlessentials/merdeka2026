# Gifts for Independence Day by Pearling

A playful, mobile-first 17 Agustus digital carnival with guaranteed gifts, a limited lucky wheel, flip-to-reveal vouchers, and first-claim riddles.

## Live site

- Entry URL: https://www.pearlinglim.com/merdeka2026/
- Hosted game: https://pearling-merdeka2026.pearling501936.chatgpt.site/

## Important architecture

Limited prize availability and riddle winners are stored server-side using D1. Claims are atomic so one-time voucher codes cannot be awarded twice. Voucher codes are never shipped in the client before a successful claim.

## Local development

```bash
pnpm install
pnpm run dev
```

Open http://localhost:3000.

## Validation

```bash
pnpm run build
```

Built with React, vinext, Cloudflare D1, and Drizzle.
