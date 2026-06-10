import BackButton from '../ui/BackButton'

export default function LegalLayout({ title, lastUpdate, children }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <BackButton />
      <div className="mt-6 bg-white rounded-2xl shadow-sm p-4 sm:p-8">
        <h1 className="text-2xl font-extrabold text-nout-dark mb-1">{title}</h1>
        {lastUpdate && (
          <p className="text-xs text-gray-400 mb-8">Dernière mise à jour : {lastUpdate}</p>
        )}
        <div className="prose-nout text-sm text-gray-600 leading-relaxed space-y-6">
          {children}
        </div>
      </div>
    </div>
  )
}

export function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-base font-bold text-nout-dark mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

export function P({ children }) {
  return <p>{children}</p>
}

export function Ul({ items }) {
  return (
    <ul className="list-disc list-inside space-y-1 text-gray-600">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  )
}
