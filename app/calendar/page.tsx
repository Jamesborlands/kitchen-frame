import Link from "next/link";
import { CalendarFull } from "@/components/CalendarFull";
import { WarningBanner } from "@/components/WarningBanner";

export const metadata = {
  title: "Calendar — Cottage View",
  description: "The family's shared calendar — what's coming up.",
};

export default function CalendarPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 pb-20">
      <WarningBanner className="mt-4" />

      <header className="pt-8 pb-2">
        <h1 className="text-4xl">calendar</h1>
        <p className="text-muted">what&rsquo;s coming up for the family.</p>
      </header>

      <div className="pt-4">
        <CalendarFull />
      </div>

      <Link href="/" className="section-label inline-block pt-10">
        ← back home
      </Link>
    </main>
  );
}
