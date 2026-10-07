/** Sello circular con texto que gira lentamente. */
export default function SealBadge({ size = 160 }: { size?: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 200 200" className="vf-rotate absolute inset-0 h-full w-full">
        <defs>
          <path id="seal-circle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" />
        </defs>
        <text fill="currentColor" fontSize="15" fontWeight="700" letterSpacing="3.4" className="font-display">
          <textPath href="#seal-circle">VERIFICADO POR PITSNEAKERS ✦ PAR POR PAR ✦</textPath>
        </text>
      </svg>
      <div className="absolute inset-[22%] flex items-center justify-center rounded-full bg-accent text-white shadow-lg">
        <svg viewBox="0 0 24 24" className="vf-check h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.500" pathLength={1} />
        </svg>
      </div>
    </div>
  );
}
