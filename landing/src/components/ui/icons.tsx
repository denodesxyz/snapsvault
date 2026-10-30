import React from 'react'

// Tabler outline icons, hand-inlined - the same icon language as the app.
export type IconName =
  | 'sun'
  | 'moon'
  | 'arrow-right'
  | 'chevron-down'
  | 'close'
  | 'file'
  | 'file-text'
  | 'pull-request'
  | 'refresh'
  | 'check-circle'
  | 'cube'
  | 'weight'
  | 'grid'
  | 'layers'
  | 'search'
  | 'shield'
  | 'download'
  | 'server'
  | 'terminal'
  | 'code'
  | 'eye'
  | 'cloud-check'
  | 'live'
  | 'loader'
  | 'calendar'
  | 'restart'

const PATHS: Record<IconName, React.ReactNode> = {
  sun: <><path d='M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0' /><path d='M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7' /></>,
  moon: <path d='M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z' />,
  'arrow-right': <><path d='M5 12h14' /><path d='M13 6l6 6l-6 6' /></>,
  'chevron-down': <path d='M6 9l6 6l6 -6' />,
  close: <><path d='M18 6L6 18' /><path d='M6 6l12 12' /></>,
  file: <><path d='M14 3v4a1 1 0 0 0 1 1h4' /><path d='M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z' /></>,
  'file-text': <><path d='M14 3v4a1 1 0 0 0 1 1h4' /><path d='M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z' /><path d='M9 13h6' /><path d='M9 17h6' /></>,
  'pull-request': <><circle cx='6' cy='18' r='2' /><circle cx='6' cy='6' r='2' /><circle cx='18' cy='18' r='2' /><path d='M6 8v8' /><path d='M11 6h5a2 2 0 0 1 2 2v8' /><path d='M14 9l-3 -3l3 -3' /></>,
  refresh: <><path d='M4 12a8 8 0 0 1 14.9 -4M20 12a8 8 0 0 1 -14.9 4' /><path d='M15 8h4v-4' /><path d='M9 16h-4v4' /></>,
  'check-circle': <><path d='M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0' /><path d='M9 12l2 2l4 -4' /></>,
  cube: <><path d='M21 16.5c0 .38 -.21 .71 -.53 .88l-7.9 4.44c-.16 .12 -.36 .17 -.57 .17s-.41 -.06 -.57 -.17l-7.9 -4.44a.99 .99 0 0 1 -.53 -.88v-9c0 -.38 .21 -.71 .53 -.88l7.9 -4.44c.16 -.12 .36 -.17 .57 -.17s.41 .06 .57 .17l7.9 4.44c.32 .17 .53 .5 .53 .88v9z' /><path d='M3.3 7l8.7 5l8.7 -5' /><path d='M12 22v-10' /></>,
  weight: <><circle cx='12' cy='5' r='3' /><path d='M6.5 8a2 2 0 0 0 -1.905 1.46l-2.495 9.04a2 2 0 0 0 1.9 2.5h16a2 2 0 0 0 1.925 -2.54l-2.525 -8.96a2 2 0 0 0 -1.92 -1.5z' /></>,
  grid: <><path d='M4 4m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z' /><path d='M14 4m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z' /><path d='M4 14m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z' /><path d='M14 14m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z' /></>,
  layers: <><path d='M12 2l-10 5l10 5l10 -5l-10 -5z' /><path d='M2 17l10 5l10 -5' /><path d='M2 12l10 5l10 -5' /></>,
  search: <><circle cx='10' cy='10' r='7' /><path d='M21 21l-6 -6' /></>,
  shield: <><path d='M12 3l8 4.5v5c0 4.5 -3.5 7 -8 8.5c-4.5 -1.5 -8 -4 -8 -8.5v-5z' /><path d='M9.5 12l1.8 1.8l3.2 -3.6' /></>,
  download: <><path d='M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2' /><path d='M7 11l5 5l5 -5' /><path d='M12 4v12' /></>,
  server: <><path d='M3 4m0 3a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3z' /><path d='M3 12m0 3a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3z' /><path d='M7 8l0 .01' /><path d='M7 16l0 .01' /></>,
  terminal: <><path d='M8 9l3 3l-3 3' /><path d='M13 15l3 0' /><path d='M3 4m0 2a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2z' /></>,
  code: <><path d='M7 8l-4 4l4 4' /><path d='M17 8l4 4l-4 4' /><path d='M14 4l-4 16' /></>,
  eye: <><path d='M10 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0' /><path d='M21 12c-2.4 4 -5.4 6 -9 6c-3.6 0 -6.6 -2 -9 -6c2.4 -4 5.4 -6 9 -6c3.6 0 6.6 2 9 6' /></>,
  'cloud-check': <><path d='M11 18.004h-4.343c-2.572 -.004 -4.657 -2.011 -4.657 -4.487c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.38 0 2.573 .813 3.13 1.99' /><path d='M15 19l2 2l4 -4' /></>,
  live: <><path d='M18.364 19.364a9 9 0 1 0 -12.728 0' /><path d='M15.536 16.536a5 5 0 1 0 -7.072 0' /><path d='M12 13m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0' /></>,
  loader: <><path d='M10 20.777a8.942 8.942 0 0 1 -2.48 -.969' /><path d='M14 3.223a9.003 9.003 0 0 1 0 17.554' /><path d='M4.579 17.093a8.961 8.961 0 0 1 -1.227 -2.592' /><path d='M3.124 10.5c.16 -.95 .468 -1.85 .9 -2.675l.169 -.305' /><path d='M6.907 4.579a8.954 8.954 0 0 1 3.093 -1.356' /></>,
  calendar: <><path d='M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z' /><path d='M16 3v4' /><path d='M8 3v4' /><path d='M4 11h16' /></>,
  restart: <><path d='M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4' /><path d='M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4' /></>,
}

export const Icon = ({ name, className }: { name: IconName; className?: string }) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' className={className}>
    {PATHS[name]}
  </svg>
)

type IconProps = { className?: string }

export const SunIcon = ({ className = 'w-4 h-4' }: IconProps) => <Icon name='sun' className={className} />
export const MoonIcon = ({ className = 'w-4 h-4' }: IconProps) => <Icon name='moon' className={className} />
export const ArrowRightIcon = ({ className = 'w-4 h-4' }: IconProps) => <Icon name='arrow-right' className={className} />
export const ChevronDownIcon = ({ className = 'w-4 h-4' }: IconProps) => <Icon name='chevron-down' className={className} />

// GitHub: Tabler outline brand-github, the same glyph and size as the app header.
export const GitHubMark = ({ className = 'size-4' }: IconProps) => (
  <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true' focusable='false' className={className}><path d='M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5' /></svg>
)
