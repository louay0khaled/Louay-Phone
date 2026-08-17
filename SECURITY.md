# Security notes

## Storefront protections

- Public order submission uses Zod validation, a server-side honeypot, request throttling, and phone normalization.
- Security response headers are configured globally in `next.config.ts`.
- Supabase admin/service-role access remains server-side only.

## Operational follow-up

Enable Supabase Auth leaked-password protection in the project dashboard.
