import React from 'react'
import { CHAIN_CONFIGS } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ChainStatusProps {
  chain: string | null
  className?: string
  showLabel?: boolean
}

export const ChainStatus = ({
  chain,
  className = "",
  showLabel = true
}: ChainStatusProps) => {
  const config = chain ? CHAIN_CONFIGS[chain as keyof typeof CHAIN_CONFIGS] : undefined

  if (!showLabel || !config) return null

  return (
    <Badge tone='chain' className={cn('capitalize', config.color.badgeBg, config.color.text, className)}>
      {config.display_name.toLowerCase()}
    </Badge>
  )
}
