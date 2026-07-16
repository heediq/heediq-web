import { cva, type VariantProps } from 'class-variance-authority'
import { useTranslation } from 'react-i18next'
import { cn } from '../../../lib/cn'

const logoVariants = cva('shrink-0', {
  variants: {
    size: {
      sm: 'h-5 w-auto',
      md: 'h-7 w-auto',
      lg: 'h-10 w-auto',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

export interface LogoProps extends VariantProps<typeof logoVariants> {
  className?: string
}

export function Logo({ size, className }: LogoProps) {
  const { t } = useTranslation()

  return (
    <img
      src="/brand/heediq-stubs.svg"
      alt={t('common.logoAlt')}
      className={cn(logoVariants({ size }), className)}
    />
  )
}
