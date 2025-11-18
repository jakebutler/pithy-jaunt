import { useEffect } from 'react'

/**
 * Workaround component to inject CSS in the head
 * TanStack Start SSR doesn't automatically inject CSS imports
 */
export function CSSInjector() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return
    }

    // Check if CSS is already loaded
    const existingLink = document.querySelector('link[href*="globals.css"]')
    if (existingLink) {
      return
    }

    // Inject the CSS link
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/src/globals.css'
    document.head.appendChild(link)
  }, [])

  return null
}

