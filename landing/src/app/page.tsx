import Hero from '@/components/hero'
import Why from '@/components/why'
import HowItWorks from '@/components/how-it-works'
import SeeItInAction from '@/components/see-it-in-action'
import Ecosystem from '@/components/ecosystem'
import Roadmap from '@/components/roadmap'
import Faq from '@/components/faq'
import { getCelestiaSnapshots, getNetworks, getCliLatest, getCliSnapshots } from '@/lib/feed'

// Top offset 32px, matching the marketplace home page; the bottom offset is 90px, 132px from the base breakpoint.
export default async function Page() {
  const [snapshots, networks, cliSnapshots, cliLatest] = await Promise.all([getCelestiaSnapshots(), getNetworks(), getCliSnapshots(), getCliLatest()])
  return (
    <div className='w-full flex flex-col gap-[106px] base:gap-[148px] pt-[32px] pb-[90px] base:pb-[132px]'>
      <Hero snapshots={snapshots} />
      <Why />
      <HowItWorks snapshots={snapshots} />
      <SeeItInAction />
      <Ecosystem networks={networks} snapshots={snapshots} cliSnapshots={cliSnapshots} cliLatest={cliLatest} />
      <Roadmap />
      <Faq />
    </div>
  )
}
