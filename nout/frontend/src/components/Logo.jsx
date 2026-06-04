import logoColor from '../assets/logo.svg'
import logoWhite from '../assets/logo-white.svg'
import logoIcon  from '../assets/favicon.svg'

const SIZES = {
  sm:  { img: 'h-7',  text: 'text-lg' },
  md:  { img: 'h-9',  text: 'text-xl' },
  lg:  { img: 'h-12', text: 'text-2xl' },
  xl:  { img: 'h-16', text: 'text-3xl' },
}

const SRCS = {
  color:      logoColor,
  white:      logoWhite,
  'icon-only': logoIcon,
}

export default function Logo({ variant = 'color', size = 'md', className = '' }) {
  const src = SRCS[variant] ?? logoColor
  const { img } = SIZES[size] ?? SIZES.md

  return (
    <img
      src={src}
      alt="NOUT — marketplace réunionnaise"
      className={`${img} w-auto object-contain ${className}`}
      draggable={false}
    />
  )
}
