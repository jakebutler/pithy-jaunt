import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-platinum-50 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-neutral-dark mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-neutral-dark mb-2">
          Page not found
        </h2>
        <p className="text-neutral-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/">
            <Button variant="primary">Go home</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline">Go to dashboard</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

