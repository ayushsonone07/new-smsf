interface AvatarProps {
  name: string
  src?: string
  size?: number
  /** `brand` = blue bg white text; `soft` = yellow tint; `muted` = grey. */
  tone?: 'brand' | 'soft' | 'muted' | 'blue'
  className?: string
}

/** Square initial avatar matching the console palette. */
export function Avatar({
  name,
  src,
  size = 30,
  tone = 'brand',
  className,
}: AvatarProps) {
  const classes = ['avatar', `avatar--${tone}`, className]
    .filter(Boolean)
    .join(' ')

  const style = {
    width: size,
    height: size,
    fontSize: Math.max(11, Math.round(size * 0.42)),
    borderRadius: Math.round(size * 0.3),
  }

  if (src) {
    return <img className={classes} src={src} alt="" style={style} />
  }

  return (
    <span className={classes} style={style}>
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}
