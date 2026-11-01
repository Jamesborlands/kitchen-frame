import Link from "next/link";
import { MapHub } from "@/components/MapHub";

export const metadata = { title: "walks & cycle routes" };

export default function MapPage() {
  return (
    <main className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="section-label">← home</Link>
        <h1 className="mt-2 mb-1 text-3xl">walks &amp; cycle routes</h1>
        <p className="mb-6 text-muted">topographic base with contours, suggested routes, flood warnings, and a plants-&amp;-wildlife layer (iNaturalist).</p>
      </div>
      <MapHub />
    </main>
  );
}
