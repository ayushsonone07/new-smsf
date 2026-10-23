import { useEffect, useMemo, useRef, useState } from "react";

import { animate, useInView } from "framer-motion";

interface AnimatedNumberProps {
  value: number | string;
  duration?: number;
  delay?: number;
  formatter?: (value: number) => string;
  className?: string;
}

interface ScopedNumber {
  prefix: string;
  number: number | null;
  suffix: string;
  decimals: number;
}

function scopedNumber(value: number | string): ScopedNumber {
  if (typeof value === "number" && Number.isFinite(value)) {
    return {
      prefix: "",
      number: value,
      suffix: "",
      decimals: Number.isInteger(value) ? 0 : 2,
    };
  }
  const text = String(value).trim();
  const match = /^(\D*)([\d.,]+)(.*)$/.exec(text);
  if (!match) return { prefix: text, number: null, suffix: "", decimals: 0 };
  const rawNumber = match[2] ?? "";
  const parsed = Number(rawNumber.replace(/,/g, ""));
  if (!Number.isFinite(parsed)) {
    return { prefix: text, number: null, suffix: "", decimals: 0 };
  }
  const decimals = rawNumber.includes(".") ? (rawNumber.split(".")[1] ?? "").length : 0;
  return { prefix: match[1] ?? "", number: parsed, suffix: match[3] ?? "", decimals };
}

function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function AnimatedNumber({
  value,
  duration = 1,
  delay = 0,
  formatter,
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -30px 0px" });
  const target = useMemo(() => scopedNumber(value), [value]);
  const formatterRef = useRef(formatter);
  formatterRef.current = formatter;
  const prevNumber = useRef(0);
  const [display, setDisplay] = useState(() =>
    target.number === null ? String(value) : target.prefix + "0" + target.suffix,
  );

  useEffect(() => {
    if (!inView) return;
    if (target.number === null) {
      setDisplay(String(value));
      prevNumber.current = 0;
      return;
    }
    const controls = animate(prevNumber.current, target.number, {
      duration,
      delay,
      ease: "easeOut",
      onUpdate: (latest) => {
        const rendered = formatterRef.current
          ? formatterRef.current(latest)
          : formatNumber(latest, target.decimals);
        setDisplay(target.prefix + rendered + target.suffix);
      },
    });
    prevNumber.current = target.number;
    return () => controls.stop();
  }, [inView, target, duration, delay, value]);

  return (
    <span ref={ref} className={className} aria-label={String(value)}>
      {display}
    </span>
  );
}