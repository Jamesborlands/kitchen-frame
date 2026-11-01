export function Section({ label, children, className = "" }: { label?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`py-5 ${className}`}>
      {label && <p className="section-label mb-3">{label}</p>}
      {children}
    </section>
  );
}
