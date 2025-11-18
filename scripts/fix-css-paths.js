#!/usr/bin/env node

/**
 * Post-build script to fix CSS path issues with Tailwind CSS v4 and Next.js
 * 
 * Tailwind CSS v4 generates CSS files with hashed names, but Next.js expects
 * them at specific paths like `static/css/app/layout.css`. This script ensures
 * the CSS files are accessible at the expected paths.
 */

import { readdir, copyFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const cssDir = join(projectRoot, '.next', 'static', 'css')
const appCssDir = join(cssDir, 'app')

async function fixCssPaths() {
  try {
    // Check if CSS directory exists
    if (!existsSync(cssDir)) {
      console.log('⚠️  CSS directory not found. Build may not have completed.')
      return
    }

    // Find all CSS files in the static/css directory
    const files = await readdir(cssDir)
    const cssFiles = files.filter(file => file.endsWith('.css') && file !== 'app')

    if (cssFiles.length === 0) {
      console.log('⚠️  No CSS files found in .next/static/css')
      return
    }

    // Ensure app subdirectory exists
    if (!existsSync(appCssDir)) {
      await mkdir(appCssDir, { recursive: true })
    }

    // Copy the first CSS file (should be the main one) to app/layout.css
    // In Next.js App Router, the root layout CSS is typically the main one
    const mainCssFile = cssFiles[0]
    const sourcePath = join(cssDir, mainCssFile)
    const targetPath = join(appCssDir, 'layout.css')

    await copyFile(sourcePath, targetPath)
    console.log(`✅ Copied ${mainCssFile} to app/layout.css`)

    // Also check if there are any other CSS files that might need to be copied
    if (cssFiles.length > 1) {
      console.log(`ℹ️  Found ${cssFiles.length} CSS files. Only the main one was copied.`)
    }
  } catch (error) {
    console.error('❌ Error fixing CSS paths:', error)
    process.exit(1)
  }
}

fixCssPaths()

