"use client";
// Shared bits for the /family tabs: big, plain buttons and section cards.
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";

export function Button({ className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className={`min-h-12 rounded-full border border-divider bg-card px-5 text-base active:bg-divider/50 disabled:opacity-40 ${className}`}
    />
  );
}

export function PrimaryButton({ className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <Button {...rest} className={`border-sage bg-sage text-white active:bg-sage/80 ${className}`} />;
}

/** A button for something that goes to the server: says "Working…" (and can't be tapped twice) until it's done. */
export function ActionButton({
  run, children, primary = false, ...rest
}: { run: () => Promise<unknown>; primary?: boolean } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick">) {
  const [busy, setBusy] = useState(false);
  const B = primary ? PrimaryButton : Button;
  return (
    <B
      {...rest}
      disabled={busy || rest.disabled}
      onClick={async () => {
        setBusy(true);
        try {
          await run();
        } catch {
          // the caller reports failures
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Working…" : children}
    </B>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-divider bg-card p-4 ${className}`}>{children}</section>;
}

export const fieldClass = "min-h-12 w-full rounded-xl border border-divider bg-white px-3 text-base";

export const OFFLINE = "Couldn't do that — check the internet connection and try again.";
