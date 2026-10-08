import { ICON_PATHS } from './iconPaths'
import type { IconName } from './iconPaths'

interface IconProps {
  name: IconName
  size?: number
  strokeWidth?: number
  className?: string
  /** Pass a raw path to render an icon not in ICON_PATHS. */
  d?: string
}

/** Stroke icon from the shared path map. */
export function Icon({
  name,
  size = 18,
  strokeWidth = 1.8,
  className,
  d,
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      style={{
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        flex: 'none',
      }}
    >
      <path d={d ?? ICON_PATHS[name]} />
    </svg>
  )
}
