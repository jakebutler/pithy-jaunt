import { createFileRoute, Link, useNavigate, redirect } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Layout } from '@/components/ui/layout'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // CRITICAL: Prevent default form submission to avoid passwords in URL
    e.preventDefault()
    e.stopPropagation()
    
    // Double-check we're not submitting via GET
    if (e.currentTarget.method === 'get') {
      console.error('Form attempted to submit via GET - this should never happen!')
      return
    }
    
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        setIsLoading(false)
        return
      }

      // Wait for cookies to be set and auth state to update, then redirect
      // Use window.location to force a full page reload and ensure auth state is synced
      // Give it a bit more time to ensure cookies are set
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 500)
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Layout showNavigation={false}>
      <div className="min-h-screen flex items-center justify-center bg-platinum-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="text-center text-h2 text-neutral-dark">
              Sign in to Pithy Jaunt
            </h2>
            <p className="mt-2 text-center text-small text-neutral-600">
              Or{' '}
              <Link
                to="/signup"
                className="font-medium text-primary hover:text-primary-dark transition-colors"
              >
                create a new account
              </Link>
            </p>
          </div>

          <form 
            className="mt-8 space-y-6" 
            onSubmit={handleSubmit}
            method="POST"
            action="/api/auth/login"
            noValidate
            encType="application/json"
          >
            {error && (
              <Alert variant="error" dismissible onDismiss={() => setError('')}>
                {error}
              </Alert>
            )}

            <div className="space-y-4">
              <Input
                id="email"
                name="email"
                type="email"
                label="Email address"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                disabled={isLoading}
              />
              <Input
                id="password"
                name="password"
                type="password"
                label="Password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-small">
                <Link
                  to="/magic-link"
                  className="font-medium text-primary hover:text-primary-dark transition-colors"
                >
                  Use magic link instead
                </Link>
              </div>

              <div className="text-small">
                <a
                  href="#"
                  className="font-medium text-primary hover:text-primary-dark transition-colors"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                isLoading={isLoading}
                className="w-full"
              >
                Sign in
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}

