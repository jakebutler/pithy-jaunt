# CSS Loading Issue Summary

## Problem
CSS files are not being served correctly in the Next.js application. The browser requests CSS files (e.g., `/_next/static/css/app/layout.css`), but receives HTML (404 page) instead of CSS content.

## Current Configuration

### Tailwind CSS Version
- **Using Tailwind CSS v4 Alpha**: `@tailwindcss/postcss: ^4.0.0-alpha.19`
- **Package**: `tailwindcss: "next"` (which resolves to v4 alpha)

### Files Involved

1. **`app/globals.css`**
   - Uses Tailwind v4 syntax: `@import 'tailwindcss'`
   - Defines custom theme using `@theme` directive
   - Contains custom color palette (Chestnut, Sky Blue, Charcoal, Platinum)

2. **`postcss.config.mjs`**
   ```javascript
   export default {
     plugins: {
       '@tailwindcss/postcss': {},
       autoprefixer: {},
     },
   }
   ```

3. **`next.config.mjs`**
   - Standard Next.js config
   - No special CSS/webpack configuration

### Symptoms

1. **CSS files return HTML**: When accessing `/_next/static/css/app/layout.css` directly, the server returns HTML (404 page) instead of CSS
2. **No CSS files in build**: The `.next` directory doesn't contain compiled CSS files
3. **HTML references CSS**: The generated HTML correctly references CSS files, but they don't exist
4. **Pages render unstyled**: While pages load, they appear without styles

### Browser Console Errors
```
GET http://localhost:3000/_next/static/css/app/layout.css?v=... net::ERR_ABORTED 404 (Not Found)
GET http://localhost:3000/_next/static/chunks/app-pages-internals.js net::ERR_ABORTED 404 (Not Found)
GET http://localhost:3000/_next/static/chunks/main-app.js?v=... net::ERR_ABORTED 404 (Not Found)
```

## Root Cause Analysis

**PRIMARY ISSUE**: URL Mismatch - CSS files ARE being generated, but Next.js is referencing the wrong path.

### Discovery:
- ✅ CSS files ARE being generated: `.next/static/css/793c88c73714f60e.css` exists
- ❌ HTML references: `/_next/static/css/app/layout.css` (doesn't exist)
- ❌ Next.js is not correctly mapping the generated CSS file to the referenced URL

### Potential Root Causes:

1. **Next.js CSS Route Handling**: Next.js may not be correctly routing CSS requests in development mode
2. **Tailwind v4 Alpha + Next.js Integration**: The alpha version may have routing/URL mapping issues
3. **Static Asset Serving**: Next.js dev server may not be serving CSS files from the correct path
4. **Build vs Dev Mode**: CSS generation works, but dev server routing is broken

## Attempted Fixes

1. ✅ Created `app/error.tsx` and `app/not-found.tsx` (required by Next.js)
2. ✅ Fixed hydration warning in `PageHeader` component
3. ✅ Cleared `.next` build cache multiple times
4. ✅ Restarted dev server multiple times
5. ✅ Verified PostCSS configuration
6. ✅ Verified `globals.css` is imported in `app/layout.tsx`
7. ✅ **Created post-build script** (`scripts/fix-css-paths.js`) to copy CSS files to expected location
8. ✅ **Added postbuild hook** to `package.json` to automatically fix CSS paths after build

## Implemented Solution

### ✅ Post-Build Script (Current Fix)

A post-build script has been created to automatically copy the generated CSS file to the expected location:

**File**: `scripts/fix-css-paths.js`
- Automatically runs after `npm run build` via `postbuild` hook
- Copies the generated CSS file from `static/css/[hash].css` to `static/css/app/layout.css`
- Ensures CSS files are accessible at the path Next.js expects

**Usage**: The script runs automatically after each build. No manual intervention needed.

### Alternative Solutions (If Current Fix Doesn't Work)

### Option 1: Downgrade to Tailwind CSS v3
- More stable and well-tested with Next.js
- Requires converting `@theme` syntax to `tailwind.config.js`
- Move custom colors from CSS to JavaScript config

### Option 2: Update Next.js Configuration
- May need to configure Next.js webpack to handle Tailwind v4's CSS generation
- Could require custom webpack configuration for CSS file paths

### Option 3: Wait for Official Tailwind v4 + Next.js Integration
- Monitor Tailwind CSS v4 release notes for official Next.js support
- Check for updates to `@tailwindcss/postcss` package

## Files to Review

1. `app/globals.css` - Tailwind v4 syntax
2. `postcss.config.mjs` - PostCSS configuration
3. `package.json` - Tailwind CSS version
4. `next.config.mjs` - Next.js configuration
5. `.next/` directory - Check if CSS files are being generated

## Testing Commands

```bash
# Check if CSS files exist in build
find .next -name "*.css" -type f

# Test CSS file directly
curl http://localhost:3000/_next/static/css/app/layout.css

# Check PostCSS processing
npx postcss app/globals.css --config postcss.config.mjs

# Verify Tailwind is processing
npx tailwindcss --help
```

## Additional Context

- **Next.js Version**: 14.2.5
- **Node Version**: v24.4.1
- **NPM Version**: 11.6.2
- **Build Tool**: Next.js built-in (no custom webpack config)
- **CSS Framework**: Tailwind CSS v4 Alpha (`@tailwindcss/postcss: ^4.0.0-alpha.19`)
- **Migration**: Recently migrated from TanStack Start to Next.js
- **CSS File Generated**: `.next/static/css/793c88c73714f60e.css` (exists but not accessible via expected URL)

## Next Steps

1. Verify Tailwind CSS v4 alpha compatibility with Next.js 14.2.5
2. Check if CSS files are being generated during build (check `.next` directory)
3. Review Next.js build logs for CSS processing errors
4. Consider downgrading to Tailwind CSS v3 for stability
5. Check if there are any Next.js configuration options needed for Tailwind v4

