import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import HomeSnapshots, { HomeSnapshotsSkeleton } from "@/components/home-snapshots";
import type { ViewMode } from "@/lib/view-mode";
import { parseViewMode, VIEW_MODE_COOKIE } from "@/lib/view-mode";
import type { SnapshotsPayload } from "@/hooks/use-snapshots";
import { getSnapshotsPayload } from "@/lib/snapshots-payload";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Bound on the server read so a slow database cannot hold the page; past it
// the page renders the skeleton and the client fetches as before.
const SERVER_READ_TIMEOUT_MS = 3000;

async function readInitialSnapshots(): Promise<SnapshotsPayload | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const payload = await Promise.race([
      getSnapshotsPayload({ network: null, chain: null }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`timed out after ${SERVER_READ_TIMEOUT_MS}ms`)), SERVER_READ_TIMEOUT_MS);
      }),
    ]);
    // Same JSON the API sends (dates as strings, ids as plain values).
    return JSON.parse(JSON.stringify(payload)) as SnapshotsPayload;
  } catch (error) {
    console.error("Home: server snapshot read failed, falling back to the client fetch:", error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function HomeContent({ initialViewMode }: { initialViewMode: ViewMode }) {
  const initialData = await readInitialSnapshots();
  return <HomeSnapshots initialData={initialData} initialViewMode={initialViewMode} />;
}

export default async function Home() {
  // cookies() first: it marks the page dynamic before any database work.
  const initialViewMode = parseViewMode((await cookies()).get(VIEW_MODE_COOKIE)?.value);

  // The fallback streams first while the server reads the snapshots. It is
  // scoped to this page, so other routes and 404s never paint it.
  return (
    <div className="w-full h-full flex flex-col gap-4 py-[32px]">
      <Suspense fallback={<HomeSnapshotsSkeleton initialViewMode={initialViewMode} />}>
        <HomeContent initialViewMode={initialViewMode} />
      </Suspense>
    </div>
  );
}
