# Brackett Frontend

Marketing site and app shell for Brackett.

## Local Development

```bash
npm install
npm run dev
```

Local URL:

```text
http://localhost:3000
```

## Environment

Copy `.env.example` to `.env` and set:

```text
VITE_API_BASE_URL=http://localhost:4000
VITE_CLERK_PUBLISHABLE_KEY=pk_test_replace_me
```

The current local auth form still talks to the Node backend for development. Production Google auth should be completed through Clerk.

## Deployment Target

- Static hosting: GitHub Pages
- Domain and SSL: Name.com or Namecheap domain connected to GitHub Pages
- Visual QA: Polypane and LambdaTest
- Editor flow: VS Code plus GitHub Desktop

GitHub Pages deployment is wired through:

```text
../.github/workflows/deploy-frontend.yml
```

Set these GitHub repository variables before running the workflow:

```text
VITE_API_BASE_URL=https://your-api-domain.example
VITE_CLERK_PUBLISHABLE_KEY=pk_live_replace_me
```

Build output:

```bash
npm run build
```

The generated static site lands in `dist/`.

The static build includes `public/404.html`, which redirects unknown GitHub Pages paths back into the React app. This keeps invite links such as `/accept-invite?token=...` working on static hosting.
