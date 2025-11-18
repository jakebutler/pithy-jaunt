import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Layout } from '@/components/ui/layout'

export const Route = createFileRoute('/magic-link')({
  component: MagicLinkPage,
})

function MagicLinkPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send magic link')
        return
      }

      setMessage(
        "Check your email! If an account exists, we've sent you a magic link."
      )
      setEmail('') // Clear the form
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
              Sign in with magic link
            </h2>
            <p className="mt-2 text-center text-small text-neutral-600">
              No password needed. We&apos;ll send you a link to sign in.
            </p>
            <p className="mt-1 text-center text-small text-neutral-600">
              Or{' '}
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary-dark transition-colors"
              >
                use password instead
              </Link>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <Alert variant="error" dismissible onDismiss={() => setError('')}>
                {error}
              </Alert>
            )}

            {message && (
              <Alert variant="success">
                <p className="font-medium">{message}</p>
                <p className="text-small mt-1">
                  The link will expire in 15 minutes. Check your spam folder if
                  you don&apos;t see it.
                </p>
              </Alert>
            )}

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

            <div>
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                isLoading={isLoading}
                className="w-full"
              >
                Send magic link
              </Button>
            </div>

            <div className="text-caption text-neutral-500 text-center">
              <p>
                By continuing, you agree to our Terms of Service and Privacy
                Policy.
              </p>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}

