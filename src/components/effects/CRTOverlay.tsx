export function CRTOverlay() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed inset-0 z-50"
        style={{
          background: "radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.4) 100%)",
        }}
        aria-hidden="true"
      />
    </>
  );
}
