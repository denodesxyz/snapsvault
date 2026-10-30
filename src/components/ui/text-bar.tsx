// Figure spaces are as wide as a digit and never break, so a run of them sizes and wraps like a
// word of the same length while carrying no readable text. The tracking narrows them to the
// width of an average letter.
const FIGURE_SPACE = ' '

export function blankWord(length: number): string {
  return FIGURE_SPACE.repeat(length)
}

// A pulsing bar in the place of text, one entry of `words` per word (its length in characters).
export function TextBar({ words }: { words: number[] }) {
  return <span aria-hidden='true' className='animate-pulse rounded-md bg-skeleton select-none tracking-[-0.12em]'>{words.map(blankWord).join(' ')}</span>
}
