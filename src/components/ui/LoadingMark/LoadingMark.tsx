import { cva, type VariantProps } from 'class-variance-authority'
import { useTranslation } from 'react-i18next'
import { cn } from '../../../lib/cn'

const sizePx = {
  sm: 28,
  lg: 72,
} as const

const wrapperVariants = cva('inline-block', {
  variants: {
    size: {
      sm: 'size-7',
      lg: 'size-[72px]',
    },
  },
  defaultVariants: {
    size: 'lg',
  },
})

export interface LoadingMarkProps extends VariantProps<typeof wrapperVariants> {
  tone?: 'flat' | 'gradient'
  className?: string
  'aria-label'?: string
}

let gradientIdCounter = 0

export function LoadingMark({
  size,
  tone = 'flat',
  className,
  'aria-label': ariaLabel,
}: LoadingMarkProps) {
  const { t } = useTranslation()
  const dimension = sizePx[size ?? 'lg']
  const gradientId = tone === 'gradient' ? `heediq-loader-gradient-${++gradientIdCounter}` : undefined
  const fill = gradientId ? `url(#${gradientId})` : '#F0A93B'

  return (
    <svg
      viewBox="0 0 120 120"
      width={dimension}
      height={dimension}
      xmlns="http://www.w3.org/2000/svg"
      role="status"
      aria-label={ariaLabel ?? t('common.loading')}
      className={cn(wrapperVariants({ size }), className)}
    >
      {gradientId ? (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor="#FFC876" />
            <stop offset="100%" stopColor="#E89A26" />
          </linearGradient>
        </defs>
      ) : null}
      <g transform="translate(55.4,51.2)">
        <g className="heediq-loader-rotate">
          <rect className="heediq-loader-bar heediq-bar-0" x="-37.5" y="-35" width="14" height="66" rx="7" fill={fill} />
          <rect className="heediq-loader-bar heediq-bar-1" x="-15.5" y="-21" width="14" height="52" rx="7" fill={fill} />
          <rect className="heediq-loader-bar heediq-bar-2" x="6.5" y="-21" width="14" height="52" rx="7" fill={fill} />
          <rect className="heediq-loader-bar heediq-bar-3" x="28.5" y="-40" width="14" height="71" rx="7" fill={fill} />
        </g>
      </g>
    </svg>
  )
}
