import Image from 'next/image'
import Link from 'next/link'

const highlights = [
  {
    title: 'Capture Ideas On-The-Go',
    description:
      'Speak or type your inspiration. Pithy Jaunt keeps every detail so you stay in the flow while walking.',
    accent: 'bg-info/10 text-info-dark',
  },
  {
    title: 'We Build It For You',
    description:
      'AI copilots analyze your repo, write code, run tests, and open pull requests without interrupting you.',
    accent: 'bg-success/10 text-success-dark',
  },
  {
    title: 'Keep Getting Inspired',
    description:
      'Continue exploring new ideas while we turn your intent into production-ready changes.',
    accent: 'bg-secondary/10 text-secondary-dark',
  },
]

const stats = [
  { value: '92%', label: 'Less context switching' },
  { value: '4x', label: 'Faster iteration speed' },
  { value: '15min', label: 'Average task kickoff' },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-platinum-50 to-platinum-100">
      <section className="container mx-auto flex flex-col items-center gap-12 px-4 pb-24 pt-24 text-center sm:pt-28 lg:pt-32">
        <span className="inline-flex items-center rounded-full bg-platinum-200/60 px-4 py-1 text-small text-neutral-dark/80 ring-1 ring-platinum-300">
          Walk, ideate, and ship · Powered by AI copilots
        </span>
        <div className="space-y-6">
          <h1 className="text-balance text-4xl font-extrabold text-neutral-dark sm:text-5xl lg:text-6xl">
            Transform ideas into code
            <span className="block text-primary">while you walk.</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-neutral-light sm:text-xl">
            Capture sparks of inspiration from anywhere. Pithy Jaunt’s orchestrated AI agents handle repo
            analysis, implementation, testing, and pull requests so you can stay inspired.
          </p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-dark hover:shadow-primary-dark/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-neutral/20 px-8 py-3 font-semibold text-neutral-dark transition hover:border-neutral hover:text-neutral focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral"
          >
            Sign In
          </Link>
        </div>
        <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl border border-white/30 bg-white/70 p-6 shadow-2xl shadow-primary/10 backdrop-blur">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
          <div className="relative grid gap-6 md:grid-cols-2">
            <div className="space-y-4 text-left">
              <p className="text-small uppercase tracking-widest text-neutral-dark/80">Live Agent Snapshot</p>
              <h2 className="text-2xl font-semibold text-neutral-dark">Walking Sync ➝ Deploy-Ready PR</h2>
              <p className="text-neutral">
                “Shipping refactor for repo ingestion while walking Mission Creek. Tests green, ready for review.”
              </p>
              <div className="flex items-center gap-3 rounded-2xl border border-platinum-200 bg-white/80 p-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary text-white">
                  <Image
                    src="/pithy-jaunt-hero.webp"
                    alt="Pithy Jaunt Icon"
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-neutral-dark">Pithy Workspace Agent</p>
                  <p className="text-small text-neutral-light">Currently validating tests</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-platinum-200/80 bg-neutral-900/95 p-4 font-mono text-sm text-white shadow-inner">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-light">live logs</p>
              <div className="mt-3 space-y-3 text-left text-primary-light">
                <p>[12:21] :: ingest :: synced new repo metadata via CodeRabbit.</p>
                <p>[12:24] :: plan :: created branch walk/refactor-repo-sync.</p>
                <p>[12:28] :: tests :: 148 specs • 0 failures.</p>
                <p>[12:31] :: pr :: opened #482 ➝ ready for review.</p>
              </div>
            </div>
          </div>
        </div>
        <dl className="grid w-full gap-6 sm:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-platinum-200 bg-white/60 p-6 text-left shadow-sm">
              <dt className="text-sm uppercase tracking-widest text-neutral-light">{stat.label}</dt>
              <dd className="mt-2 text-3xl font-bold text-neutral-dark">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="container mx-auto px-4 pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {highlights.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-platinum-200 bg-white p-6 shadow-md transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span className={`inline-flex rounded-full px-3 py-1 text-small font-medium ${item.accent}`}>
                Pithy Jaunt
              </span>
              <h3 className="mt-4 text-2xl font-semibold text-neutral-dark">{item.title}</h3>
              <p className="mt-3 text-neutral">{item.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

