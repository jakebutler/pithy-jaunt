import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { createClient } from '@/lib/auth/supabase-server-tanstack'

export const Route = createFileRoute('/')({
  loader: async ({ context }) => {
    // Check authentication - if user is logged in, redirect to dashboard
    const request = context.request
    const supabase = createClient(request)
    
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      throw redirect({
        to: '/dashboard',
      })
    }

    // Return empty data for unauthenticated users (landing page)
    return {}
  },
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 lg:pt-24 pb-12 sm:pb-16">
        <div className="text-center">
          {/* Hero Image */}
          <div className="flex justify-center mb-8 sm:mb-12">
            <picture>
              <source srcSet="/pithy-jaunt-hero.webp" type="image/webp" />
              <img
                src="/pithy-jaunt-hero.jpg"
                alt="Pithy Jaunt - AI-Powered DevOps Autopilot"
                className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 object-contain"
                width={320}
                height={320}
              />
            </picture>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6">
            Transform Ideas Into Code
            <br />
            <span className="text-blue-600">While You Walk</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-3xl mx-auto mb-8 sm:mb-12 px-4">
            Capture your ideas on-the-go. Let Pithy Jaunt build them into working pull requests.
            Keep getting inspired while we do the hard work.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 sm:mb-16">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-4 bg-white text-gray-900 text-lg font-semibold rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
          {/* Value Prop 1 */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
              Capture Ideas On-The-Go
            </h2>
            <p className="text-gray-600 text-base sm:text-lg">
              Have a brilliant idea while walking? Voice or type it in. Pithy Jaunt captures it instantly, so you never lose inspiration.
            </p>
          </div>

          {/* Value Prop 2 */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
              We Build It For You
            </h2>
            <p className="text-gray-600 text-base sm:text-lg">
              Our AI-powered agents analyze your repo, write the code, run tests, and create pull requests—all automatically.
            </p>
          </div>

          {/* Value Prop 3 */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
              Keep Getting Inspired
            </h2>
            <p className="text-gray-600 text-base sm:text-lg">
              While Pithy Jaunt handles the implementation, you can keep walking, thinking, and dreaming up your next great feature.
            </p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="bg-blue-600 rounded-2xl p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">
            Ready to Transform Your Workflow?
          </h2>
          <p className="text-lg sm:text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join developers who are building faster by letting AI handle the implementation while they focus on what matters.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="px-8 py-4 bg-white text-blue-600 text-lg font-semibold rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
            >
              Start Building
            </Link>
            <Link
              to="/login"
              className="px-8 py-4 bg-transparent text-white text-lg font-semibold rounded-lg border-2 border-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-200">
        <div className="text-center text-gray-600 text-sm">
          <p>
            Built with ❤️ for developers who want to code while they walk
          </p>
          <p className="mt-2">
            <a
              href="https://github.com/jakebutler/pithy-jaunt"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              View on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
