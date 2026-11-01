import { notFound } from "next/navigation";
import { locationBySlug, ALL_LOCATIONS } from "@/lib/config";
import { LocationDetail } from "@/components/LocationDetail";

export function generateStaticParams() {
  return ALL_LOCATIONS.map((l) => ({ place: l.slug }));
}

export default async function PlacePage({ params }: { params: Promise<{ place: string }> }) {
  const { place } = await params;
  const location = locationBySlug(place);
  if (!location) notFound();
  return <LocationDetail location={location} />;
}
