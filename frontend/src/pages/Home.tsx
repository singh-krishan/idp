import { Link } from 'react-router-dom'

const steps = [
  {
    number: '01',
    title: 'Choose a Template',
    description: 'Python FastAPI, Node.js Express, OpenAPI spec, or Apache Camel YAML DSL.',
    color: 'from-accent-500 to-accent-700',
  },
  {
    number: '02',
    title: 'Configure & Create',
    description: 'Name your service, set options, upload specs if needed. One click to launch.',
    color: 'from-emerald-500 to-emerald-700',
  },
  {
    number: '03',
    title: 'Automated Pipeline',
    description: 'GitHub repo, CI/CD, Docker build, ArgoCD sync — all fully automated.',
    color: 'from-purple-500 to-purple-700',
  },
  {
    number: '04',
    title: 'Live in Minutes',
    description: 'Your service deploys to Kubernetes with HTTPS, health checks, and monitoring.',
    color: 'from-cyan-500 to-cyan-700',
  },
]

const features = [
  { icon: '{}', label: 'Source Code', desc: 'Best-practice project structure' },
  { icon: '🐳', label: 'Docker', desc: 'Multi-stage containerization' },
  { icon: '⚡', label: 'CI/CD', desc: 'GitHub Actions pipeline' },
  { icon: '☸️', label: 'Helm Charts', desc: 'Kubernetes deployment' },
  { icon: '💚', label: 'Health Checks', desc: 'Liveness & readiness probes' },
  { icon: '📊', label: 'Monitoring', desc: 'Prometheus & Grafana' },
]

const techStack = [
  { name: 'FastAPI', role: 'Backend API' },
  { name: 'React', role: 'Frontend' },
  { name: 'GitHub', role: 'Source & CI/CD' },
  { name: 'ArgoCD', role: 'GitOps' },
  { name: 'k3s', role: 'Kubernetes' },
  { name: 'NGINX', role: 'Ingress & TLS' },
  { name: 'Prometheus', role: 'Metrics' },
  { name: 'PostgreSQL', role: 'Database' },
]

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/[0.06]">
        <div className="absolute inset-0 bg-hero-glow" />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="font-display text-5xl sm:text-6xl font-extrabold text-white tracking-tight animate-fade-in">
            Deploy microservices
            <br />
            <span className="bg-gradient-to-r from-accent-400 via-cyber-cyan to-accent-400 bg-clip-text text-transparent">
              in minutes, not hours
            </span>
          </h1>
          <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.15s' }}>
            DevForge automates the entire lifecycle — from template to production.
            GitHub repo, CI/CD, Docker, Kubernetes, monitoring — all with one click.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link to="/create" className="btn-success text-sm no-underline px-6 py-3">
              Create Project
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link to="/dashboard" className="btn-ghost text-sm no-underline px-6 py-3">
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="font-display text-3xl font-bold text-white text-center mb-12">How It Works</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step, i) => (
            <div key={step.number} className="glass-card-hover p-5 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 shadow-sm`}>
                <span className="text-white text-xs font-bold font-mono">{step.number}</span>
              </div>
              <h3 className="font-display font-semibold text-white text-sm mb-1.5">{step.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What's included */}
      <div className="border-y border-white/[0.06] bg-white/[0.01]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="font-display text-3xl font-bold text-white text-center mb-4">Every Template Includes</h2>
          <p className="text-gray-500 text-center mb-12 max-w-lg mx-auto">Production-ready infrastructure from day one.</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {features.map((f) => (
              <div key={f.label} className="glass-card p-4 flex items-start gap-3">
                <span className="text-lg">{f.icon}</span>
                <div>
                  <p className="text-sm font-medium text-white">{f.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Architecture flow */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="font-display text-3xl font-bold text-white text-center mb-12">Architecture</h2>

        <div className="glass-card p-8 overflow-hidden">
          <div className="font-mono text-sm space-y-1.5 text-gray-400">
            {[
              { text: 'Your Request', color: 'text-white' },
              { text: '  ↓', color: 'text-gray-600' },
              { text: 'FastAPI Backend', color: 'text-accent-400' },
              { text: '  ↓', color: 'text-gray-600' },
              { text: 'Template Engine → Project files generated', color: 'text-purple-400' },
              { text: '  ↓', color: 'text-gray-600' },
              { text: 'GitHub → Repo created, code pushed', color: 'text-gray-300' },
              { text: '  ↓', color: 'text-gray-600' },
              { text: 'GitHub Actions → Docker image built & pushed', color: 'text-amber-400' },
              { text: '  ↓', color: 'text-gray-600' },
              { text: 'ArgoCD → Syncs Helm chart to Kubernetes', color: 'text-cyan-400' },
              { text: '  ↓', color: 'text-gray-600' },
              { text: 'k3s → Deployment + Service + Ingress', color: 'text-accent-400' },
              { text: '  ↓', color: 'text-gray-600' },
              { text: 'Your service is LIVE', color: 'text-emerald-400 font-semibold' },
            ].map((line, i) => (
              <div key={i} className={line.color}>{line.text}</div>
            ))}
          </div>
        </div>

        {/* Tech stack */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {techStack.map((t) => (
            <div key={t.name} className="glass-card px-4 py-3 text-center">
              <p className="text-sm font-medium text-white">{t.name}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{t.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08]" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(34, 211, 238, 0.05))' }}>
          <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
          <div className="relative p-10 text-center">
            <h2 className="font-display text-2xl font-bold text-white mb-3">Ready to build?</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Create your first microservice and have it running in production in under 5 minutes.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/create" className="btn-success text-sm no-underline px-6 py-3">
                Create Project
              </Link>
              <Link to="/dashboard" className="btn-ghost text-sm no-underline px-6 py-3">
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
