import React from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ChevronDownIcon, SearchIcon } from '@/components/ui/icons'
import { SnapshotData } from '@/components/ui/snapshot-card'

interface SnapshotFiltersProps {
  snapshots: SnapshotData[]
  filters: {
    searchQuery: string
    selectedNetwork: string
    selectedChain: string
  }
  onFiltersChange: (filters: Partial<SnapshotFiltersProps['filters']>) => void
  showChainFilter?: boolean
  showSearchFilter?: boolean
}

export const SnapshotFilters = ({
  snapshots,
  filters,
  onFiltersChange,
  showChainFilter = true,
  showSearchFilter = true
}: SnapshotFiltersProps) => {
  const { searchQuery, selectedChain } = filters
  const allChainsLabel = 'Chains'
  const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

  const getUniqueChains = () => {
    const chains = new Map()
    snapshots.forEach(snapshot => {
      const chain = snapshot.chain || ''
      if (!chain) return
      const chainKey = chain.toLowerCase()
      if (!chains.has(chainKey)) {
        chains.set(chainKey, {
          key: chainKey,
          name: chain,
          count: 0
        })
      }
      chains.get(chainKey).count++
    })
    return Array.from(chains.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  const uniqueChains = getUniqueChains()

  return (
    <div className='flex gap-2 items-center flex-wrap [@media(max-width:700px)]:flex-nowrap [@media(max-width:700px)]:flex-1 [@media(max-width:700px)]:min-w-0'>

      <div className='flex gap-2 items-center [@media(max-width:700px)]:order-1 [@media(max-width:700px)]:flex-1 [@media(max-width:700px)]:min-w-0 [@media(max-width:700px)]:justify-start [@media(min-width:701px)]:contents'>
        {showSearchFilter && (
          <div className='relative order-4 [@media(max-width:700px)]:order-2 [@media(max-width:700px)]:w-auto [@media(max-width:700px)]:flex-1 [@media(max-width:700px)]:min-w-0 [@media(min-width:701px)_and_(max-width:1089px)]:order-2'>
            <SearchIcon className='absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4' />
            <input
              type='text'
              placeholder='Search'
              value={searchQuery}
              onChange={(e) => onFiltersChange({ searchQuery: e.target.value })}
              className='h-9 pl-10 pr-4 border rounded-md bg-background shadow-xs dark:bg-input/30 dark:border-input text-foreground placeholder:text-muted-foreground text-sm w-[232px] [@media(max-width:700px)]:w-full'
            />
          </div>
        )}
      </div>

      <div className='flex gap-2 items-center [@media(max-width:700px)]:order-2 [@media(max-width:700px)]:shrink-0 [@media(max-width:700px)]:justify-start [@media(min-width:701px)]:contents'>
        {showChainFilter && (
          <div className='order-2 [@media(max-width:700px)]:w-auto [@media(max-width:700px)]:min-w-0 [@media(min-width:701px)_and_(max-width:1089px)]:order-4'>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className='gap-2 [@media(max-width:700px)]:w-auto [@media(max-width:700px)]:justify-start'>
                  <div className="flex items-center gap-2 [@media(max-width:700px)]:min-w-0">
                    <span className="[@media(max-width:700px)]:max-w-[120px] [@media(max-width:700px)]:truncate">
                      {selectedChain === 'all' ? allChainsLabel : capitalize(uniqueChains.find(n => n.key === selectedChain)?.name || selectedChain)}
                    </span>
                  </div>
                  <ChevronDownIcon className='h-4 w-4 [@media(max-width:700px)]:flex-shrink-0' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => onFiltersChange({ selectedChain: 'all' })}>
                  <span className="flex justify-between items-center w-full">
                    All chains
                    <span className="text-xs text-muted-foreground ml-2">{snapshots.length}</span>
                  </span>
                </DropdownMenuItem>
                {uniqueChains.map((chain) => (
                  <DropdownMenuItem key={chain.key} onClick={() => onFiltersChange({ selectedChain: chain.key })}>
                    <span className="flex justify-between items-center w-full">
                      {capitalize(chain.name)}
                      <span className="text-xs text-muted-foreground ml-2">{chain.count}</span>
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

    </div>
  )
}
