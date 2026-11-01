import Link from "next/link";
import { FamilyMessageBoard } from "@/components/FamilyMessageBoard";
import { WarningBanner } from "@/components/WarningBanner";

export const metadata = {
  title: "Messages — Cottage View",
  description: "Notes from the family on the flip board.",
};

export default function MessagesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-20">
      <WarningBanner className="mt-4" />

      <header className="pt-8 pb-6">
        <h1 className="text-4xl">messages</h1>
        <p className="text-muted">notes from the family — WhatsApp one to the number.</p>
      </header>

      <FamilyMessageBoard />

      <Link href="/" className="section-label inline-block pt-10">
        ← back home
      </Link>
    </main>
  );
}
