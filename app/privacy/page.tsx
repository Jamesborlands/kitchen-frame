import Link from "next/link";

export const metadata = {
  title: "Privacy — Cottage View",
  description: "Privacy policy for the Cottage View family dashboard.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 pb-24">
      <header className="pt-12 pb-6">
        <h1 className="text-4xl">privacy</h1>
        <p className="text-muted">cottage view — a private family dashboard</p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed">
        <p>
          Cottage View is a small, private dashboard made for one family. It shows the weather,
          local information, and a photo frame for the family&rsquo;s kitchen. It is not a public
          service and is not used to advertise to anyone.
        </p>

        <section className="space-y-2">
          <h2 className="text-xl">what we collect</h2>
          <p>
            The only personal data this app handles is what a family member chooses to send to the
            family&rsquo;s WhatsApp number: <strong>photos and short text notes</strong>, together
            with the sender&rsquo;s WhatsApp display name. We do not collect contacts, location,
            browsing history, or any other information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl">how it is used</h2>
          <p>
            Photos and notes sent to the family number are shown on the family&rsquo;s own kitchen
            screen and nowhere else. They are never sold, shared with third parties, or used for
            advertising or analytics.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl">how long it is kept</h2>
          <p>
            Text notes are automatically deleted after <strong>24 hours</strong>. Photos are kept
            only as the most recent handful and roll off as new ones arrive. Nothing is retained
            long-term.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl">where it is stored</h2>
          <p>
            Data is stored using Vercel&rsquo;s Blob and KV (Upstash Redis) services solely to
            display it on the family screen. Access is restricted to the dashboard itself.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl">deleting your data</h2>
          <p>
            To remove a photo or note immediately, or to have all data cleared, email{" "}
            <a className="underline" href="mailto:hello@example.com">
              hello@example.com
            </a>{" "}
            and it will be deleted promptly. Stopping messages to the family number also stops any
            new data being stored, and existing items expire as described above.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl">contact</h2>
          <p>
            Questions about this policy:{" "}
            <a className="underline" href="mailto:hello@example.com">
              hello@example.com
            </a>
            .
          </p>
        </section>

        <p className="text-muted">Last updated 25 June 2026.</p>

        <Link href="/" className="section-label inline-block pt-2">
          ← back home
        </Link>
      </div>
    </main>
  );
}
