import React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { TextBar, blankWord } from "@/components/ui/text-bar"
import { Badge } from "@/components/ui/badge"
import { HeightIcon, ClockIcon, SizeIcon, TypeIcon } from "@/components/ui/icons"

// A text slot: the line box of the real text with a bar inside it.
function TextSlot({ line, bar }: { line: string; bar: string }) {
  return (
    <div className={`${line} flex items-center`}>
      <Skeleton className={bar} />
    </div>
  )
}

function CardDetailRow({ icon, label, value, last = false }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <div className={`flex items-center gap-1 ${last ? "pb-1" : ""}`}>
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <TextSlot line="h-5" bar={`h-4 ${value}`} />
    </div>
  )
}

// Same boxes as snapshot-card.tsx: the static labels and icons are real,
// the data (network, chain ID, chain, values, contributor) are bars sized
// to the line boxes of the real text.
export function SnapshotCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`relative w-full h-full p-4 rounded-md border border-transparent bg-secondary-background text-sm ${className}`}>
      <div className="relative h-full flex flex-col gap-1">
        <div className="flex justify-between items-start pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div>
              <TextSlot line="h-6" bar="h-4 w-20" />
              <TextSlot line="h-4" bar="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-5 w-16 rounded-sm" />
        </div>

        <CardDetailRow icon={<HeightIcon />} label="Height" value="w-20" />
        <CardDetailRow icon={<ClockIcon />} label="Time" value="w-24" />
        <CardDetailRow icon={<SizeIcon />} label="Size" value="w-14" />
        <CardDetailRow icon={<TypeIcon />} label="Type" value="w-12" last />

        <div className="flex justify-between items-center border-t pt-2 mt-2">
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Contributor</span>
          </div>
          <div className="flex items-center gap-1">
            <Skeleton className="w-8 h-8 rounded-full" />
            <TextSlot line="h-6" bar="h-4 w-20" />
          </div>
        </div>
      </div>
    </div>
  )
}

// The real count is unknown before data, so the grid shows the rows that
// fill the first screen: one card on phones, then two rows at every column
// count (2, 3 and 4 per row). Rows below the fold grow when data arrives.
const GRID_SKELETON_VISIBILITY = [
  "",
  "hidden xs:block",
  "hidden xs:block",
  "hidden xs:block",
  "hidden md:block",
  "hidden md:block",
  "hidden lg:block",
  "hidden lg:block",
]

// Same grid classes as the loaded card grid in snapshots-grid.tsx.
export function SnapshotGridSkeleton() {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {GRID_SKELETON_VISIBILITY.map((visibility, index) => (
        <SnapshotCardSkeleton key={index} className={visibility} />
      ))}
    </div>
  )
}

const TABLE_SKELETON_COLUMNS = ["Network", "Chain", "Height", "Time", "Size", "Type", "Contributor"]

// Enough rows to reach past the fold at 1440x900.
const TABLE_SKELETON_ROWS = 8

// Matches snapshot-table.tsx: the same wrapper, header row (label in the
// same inline-flex box as the sort button), cell classes and row height.
// The bars hold text as long as the widest typical values, so the auto
// table layout gives the columns the widths of the loaded table and the
// header labels do not move when the rows arrive.
export function SnapshotTableSkeleton() {
  return (
    <div aria-hidden="true" className="sv-scroll relative w-full overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <caption className="sr-only">Latest snapshots</caption>
        <thead>
          <tr className="border-b bg-secondary-background text-left text-muted-foreground">
            {TABLE_SKELETON_COLUMNS.map(label => (
              <th key={label} scope="col" className="py-2 px-3 font-medium">
                <span className="inline-flex items-center gap-1 font-medium">{label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: TABLE_SKELETON_ROWS }).map((_, index) => (
            <tr key={index} className="border-b border-border/50">
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium"><TextBar words={[8]} /></span>
                    <span className="text-xs"><TextBar words={[8]} /></span>
                  </div>
                </div>
              </td>
              <td className="py-3 px-3"><Badge tone="chain" className="capitalize animate-pulse bg-skeleton select-none tracking-[-0.12em]">{blankWord(7)}</Badge></td>
              <td className="py-3 px-3 whitespace-nowrap"><TextBar words={[3]} /></td>
              <td className="py-3 px-3 whitespace-nowrap"><TextBar words={[2, 5, 3]} /></td>
              <td className="py-3 px-3 whitespace-nowrap"><TextBar words={[5, 2]} /></td>
              <td className="py-3 px-3 capitalize whitespace-nowrap"><TextBar words={[7]} /></td>
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                  <span className="font-medium whitespace-nowrap"><TextBar words={[10]} /></span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
