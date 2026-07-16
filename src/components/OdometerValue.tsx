"use client";

const SPIN_CYCLES = 2;
const SPIN_DURATION_MS = 1600;

function DigitRoller({
  digit,
  play,
  delay,
}: {
  digit: number;
  play: boolean;
  delay: number;
}) {
  const sequence = Array.from(
    { length: SPIN_CYCLES * 10 + digit + 1 },
    (_, i) => i % 10
  );
  const targetIndex = sequence.length - 1;

  return (
    <span
      className="inline-block h-[1em] overflow-hidden align-top tabular-nums"
      style={{ lineHeight: 1 }}
    >
      <span
        className="block"
        style={{
          transform: `translateY(-${play ? targetIndex : 0}em)`,
          transition: play
            ? `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`
            : "none",
        }}
      >
        {sequence.map((d, i) => (
          <span key={i} className="block h-[1em]" style={{ lineHeight: 1 }}>
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function OdometerValue({
  value,
  play,
}: {
  value: string;
  play: boolean;
}) {
  const chars = value.split("");
  const digitIndexes = chars.map((_, i) =>
    chars.slice(0, i).filter((c) => /\d/.test(c)).length
  );

  return (
    <span className="inline-flex tabular-nums">
      {chars.map((char, i) => {
        if (/\d/.test(char)) {
          return (
            <DigitRoller
              key={i}
              digit={Number(char)}
              play={play}
              delay={digitIndexes[i] * 90}
            />
          );
        }
        return (
          <span
            key={i}
            className="inline-block h-[1em] align-top"
            style={{ lineHeight: 1 }}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}
