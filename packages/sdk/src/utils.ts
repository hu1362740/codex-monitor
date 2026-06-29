export function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = (Math.random() * 16) | 0;
    const next = char === "x" ? value : (value & 0x3) | 0x8;
    return next.toString(16);
  });
}

export function now(): number {
  return Date.now();
}

export function matchesPattern(input: string, patterns: Array<string | RegExp> = []): boolean {
  return patterns.some((pattern) => {
    if (typeof pattern === "string") {
      return input.includes(pattern);
    }
    return pattern.test(input);
  });
}

export function getTargetPath(target: EventTarget | null): string | undefined {
  if (!(target instanceof Element)) {
    return undefined;
  }

  const parts: string[] = [];
  let current: Element | null = target;
  while (current && parts.length < 5) {
    const id = current.id ? `#${current.id}` : "";
    const cls = current.className && typeof current.className === "string"
      ? `.${current.className.trim().split(/\s+/).slice(0, 3).join(".")}`
      : "";
    parts.unshift(`${current.tagName.toLowerCase()}${id}${cls}`);
    current = current.parentElement;
  }
  return parts.join(" > ");
}

export function getViewport(): string {
  if (typeof window === "undefined") {
    return "0x0";
  }
  return `${window.innerWidth}x${window.innerHeight}`;
}
