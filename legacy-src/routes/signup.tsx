import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Layout } from '@/components/ui/layout'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // CRITICAL: Prevent default form submission to avoid passwords in URL
    e.preventDefault()
    e.stopPropagation()
    
    // Double-check we're not submitting via GET
    const form = e.currentTarget
    if (form.method === 'get' || !form.method) {
      console.error('Form attempted to submit via GET - this should never happen!')
      return
    }
    
    setError('')

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Validate password length
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Signup failed')
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
              Create your account
            </h2>
            <p className="mt-2 text-center text-small text-neutral-600">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-primary hover:text-primary-dark transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>

          <form 
            className="mt-8 space-y-6" 
            onSubmit={handleSubmit}
            method="POST"
            action="/api/auth/signup"
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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (minimum 8 characters)"
                disabled={isLoading}
              />
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                label="Confirm password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                disabled={isLoading}
              />
            </div>

            <div className="text-small text-neutral-600">
              <p>Password requirements:</p>
              <ul className="list-disc list-inside mt-1">
                <li>At least 8 characters long</li>
              </ul>
            </div>

            <div>
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                isLoading={isLoading}
                className="w-full"
              >
                Create account
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}

