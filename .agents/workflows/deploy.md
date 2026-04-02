---
description: Deploy SmartX frontend to production (smartx.alokkumarsahu.in)
---

# SmartX Deployment Workflow

> **CRITICAL**: Always deploy to the production Cloudflare Pages project.
> NEVER deploy to preview URLs (*.pages.dev subdomains).
> The live production domain is: **smartx.alokkumarsahu.in** (also accessible at **alokkumarsahu.in**)

## Steps

### 1. Build the frontend
```bash
cd frontend
npm run build
```

### 2. Deploy to Cloudflare Pages (production branch)
```bash
npx wrangler pages deploy dist --project-name smartchatx-app --branch main --commit-dirty=true 2>&1
```

> This deploys to the `main` branch of the `smartchatx-app` Cloudflare Pages project,
> which is mapped to the custom domain **smartx.alokkumarsahu.in**.
> The `--branch main` flag ensures the deployment goes to production, NOT a preview URL.

## Notes
- Do NOT use `npx wrangler pages deploy dist` without `--branch main` — that creates a preview deployment on a random `*.pages.dev` URL.
- The custom domain **smartx.alokkumarsahu.in** is configured in the Cloudflare Pages dashboard under "Custom Domains" for the `smartchatx-app` project on the `main` branch.
- Backend is deployed separately on Render (see render.yaml).
