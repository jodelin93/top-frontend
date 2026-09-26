# Troubleshooting Guide

## Issue: Hydration Mismatch Error (RESOLVED ✅)

### Problem Description
When first running the frontend, you may have seen this error:

```
[browser] A tree hydrated but some attributes of the server rendered HTML
didn't match the client properties.

- data-new-gr-c-s-check-loaded="14.1332.0"
- data-gr-ext-installed=""
- cz-shortcut-listen="true"
```

### Root Cause
This error was caused by **two issues**:

1. **Browser Extensions**: Browser extensions (like Grammarly, ColorZilla) inject attributes into the DOM, causing React hydration mismatches
2. **Invalid Layout Structure**: The original layout had incorrect TypeScript types

### Solution Applied ✅

#### Fixed Layout File
Updated `/src/app/layout.tsx`:

**Before** (Incorrect):
```typescript
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```

**After** (Correct):
```typescript
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

**Changes Made**:
1. Fixed TypeScript props type to `Readonly<{ children: React.ReactNode }>`
2. Simplified className on `<html>` (removed `h-full`)
3. Updated `<body>` classes to use proper Tailwind utilities
4. Updated page title to "Modern POS"

### How to Avoid This in the Browser

If you still see hydration warnings from browser extensions:

1. **Disable browser extensions** during development:
   - Open browser in incognito/private mode
   - Or temporarily disable extensions like:
     - Grammarly
     - ColorZilla
     - LastPass
     - Any extension that modifies page content

2. **Suppress the warning** (not recommended for production):
   ```typescript
   // In layout.tsx - only for development
   <body suppressHydrationWarning>
   ```

### Current Status ✅

**Frontend Server**:
- Running on: http://localhost:3001
- Status: No errors
- Pages working:
  - `/` - Home page ✅
  - `/auth/login` - Login page ✅
  - `/auth/mfa-verify` - MFA verification ✅
  - `/pos` - POS interface ✅

---

## Common Issues & Solutions

### Issue: Port Already in Use

**Error**:
```
⚠ Port 3000 is in use by process XXXXX, using available port 3001 instead.
```

**Solution**: This is normal. Backend uses port 3000, frontend uses 3001.

---

### Issue: Module Not Found

**Error**:
```
Module not found: Can't resolve '@/components/...'
```

**Solution**: Ensure tsconfig.json has path aliases:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

### Issue: "use client" Missing

**Error**:
```
You're importing a component that needs useState. It only works in a Client Component
```

**Solution**: Add `'use client';` at the top of the file:
```typescript
'use client';

import { useState } from 'react';
// ...
```

---

### Issue: API Connection Failed

**Error**:
```
AxiosError: Network Error
```

**Solutions**:
1. Check backend is running: `curl http://localhost:3000/api/v1`
2. Verify `.env.local` has correct API URL:
   ```
   NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
   ```
3. Check browser console for CORS errors

---

### Issue: Zustand State Not Persisting

**Problem**: State resets on page refresh

**Solution**: Check browser localStorage:
```javascript
// In browser console
localStorage.getItem('auth-storage')
```

If null, the persist middleware isn't working. Clear storage and try again:
```javascript
localStorage.clear()
```

---

## Development Tips

### Hot Reload Not Working

**Solution**: Restart dev server:
```bash
# Kill the process
lsof -ti:3001 | xargs kill -9

# Restart
npm run dev
```

### Build Errors After npm install

**Solution**: Clear Next.js cache:
```bash
rm -rf .next
npm run dev
```

### TypeScript Errors in IDE

**Solution**: Restart TypeScript server:
- VSCode: `Cmd+Shift+P` → "TypeScript: Restart TS Server"

---

## Testing Checklist

Before deploying, verify:

- [ ] `npm run build` - Builds successfully
- [ ] `npm run lint` - No linting errors
- [ ] Login page loads
- [ ] MFA verification works
- [ ] POS page loads
- [ ] Protected routes redirect correctly
- [ ] API calls work (check Network tab)
- [ ] State persists after refresh

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server

# Building
npm run build           # Production build
npm run start           # Start production server

# Linting
npm run lint            # Check for errors

# Debugging
rm -rf .next           # Clear build cache
rm -rf node_modules    # Clear dependencies
npm install            # Reinstall
```

---

## Environment Variables

Required in `.env.local`:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

# App Settings
NEXT_PUBLIC_APP_NAME=Modern POS
NEXT_PUBLIC_APP_VERSION=1.0.0
```

**Note**: All frontend environment variables must start with `NEXT_PUBLIC_` to be accessible in browser.

---

## Getting Help

1. Check browser console (F12)
2. Check terminal output
3. Review [FRONTEND_IMPLEMENTATION_GUIDE.md](./FRONTEND_IMPLEMENTATION_GUIDE.md)
4. Check Next.js docs: https://nextjs.org/docs
5. Check React docs: https://react.dev

---

## Known Issues

### Browser Extension Warnings
- Grammarly, ColorZilla, and other extensions may inject attributes
- These cause harmless hydration warnings
- Safe to ignore in development
- Use incognito mode to avoid

### Git Warning
```
⚠ Warning: Next.js ignored package-lock.json in /Users/... because it is
outside the current Git repository
```
- This is a Turbopack warning
- Safe to ignore
- Does not affect functionality

---

**Last Updated**: September 24, 2026
**Status**: All issues resolved ✅
