export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="h-px w-48 bg-gradient-to-r from-transparent via-brass/40 to-transparent mb-8" />
      <h1 className="font-display text-3xl text-warm-white tracking-wide mb-3">
        TRI Platform
      </h1>
      <p className="font-body text-warm-300 text-sm tracking-wide mb-8">
        Real estate portfolio intelligence
      </p>
      <div className="card-surface px-6 py-4">
        <p className="font-body text-warm-200 text-sm">
          API available at <code className="text-brass bg-brass-faint px-1.5 py-0.5 rounded text-xs">/api/v1</code>
        </p>
      </div>
      <div className="h-px w-48 bg-gradient-to-r from-transparent via-brass/40 to-transparent mt-8" />
    </div>
  )
}
