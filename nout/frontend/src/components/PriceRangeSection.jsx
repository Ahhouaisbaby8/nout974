import { useNavigate } from 'react-router-dom'

const PRICE_RANGES = [
  { label: '10€',  max: 10  },
  { label: '25€',  max: 25  },
  { label: '50€',  max: 50  },
  { label: '100€', max: 100 },
]

export default function PriceRangeSection() {
  const navigate = useNavigate()

  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <h2 className="font-title font-bold text-[22px] text-nout-texte mb-5">
        Acheter par prix
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {PRICE_RANGES.map(({ label, max }) => (
          <button
            key={max}
            onClick={() => navigate(`/recherche?max=${max}`)}
            className="group flex flex-col items-center justify-center h-[96px] rounded-[14px] border border-[#ECEFF4] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-nout-turquoise hover:shadow-nout-hover cursor-pointer"
          >
            <span className="text-[12px] text-nout-muted font-normal leading-tight">
              Moins de
            </span>
            <span className="font-title font-semibold text-[22px] text-nout-texte tracking-tight leading-tight mt-1">
              {label}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
