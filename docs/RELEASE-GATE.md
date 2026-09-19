# Release and Quality Gate

Production changes should follow this path:

1. Feature branch
2. Pull request to main
3. Release Gate: typecheck, lint, unit tests, build
4. Vercel Preview
5. Browser/API smoke verification
6. Merge to main
7. Production deployment
8. Runtime error scan and Supabase advisors

## Required commands

```bash
npm ci
npm run release:gate
npm run test:e2e
```

## Production verification

Check:
- Vercel deployment = READY
- GitHub status = success
- /api/health reachable
- no new Vercel runtime error cluster
- Supabase security/performance advisors contain no new high-impact findings
