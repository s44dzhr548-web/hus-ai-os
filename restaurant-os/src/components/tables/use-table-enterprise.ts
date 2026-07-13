"use client";

import { useCallback, useRef, useState } from "react";

export interface UndoEntry {
  label: string;
  undo: () => Promise<void>;
}

export function useTableUndo() {
  const stack = useRef<UndoEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  const push = useCallback((entry: UndoEntry) => {
    stack.current.push(entry);
    if (stack.current.length > 10) stack.current.shift();
    setCanUndo(true);
  }, []);

  const undo = useCallback(async () => {
    const entry = stack.current.pop();
    if (entry) await entry.undo();
    setCanUndo(stack.current.length > 0);
  }, []);

  return { push, undo, canUndo };
}

export function useAutoSave(delayMs = 800) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const schedule = useCallback(
    (fn: () => Promise<void>) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        setSaving(true);
        try {
          await fn();
          setLastSaved(new Date());
        } finally {
          setSaving(false);
        }
      }, delayMs);
    },
    [delayMs]
  );

  return { schedule, saving, lastSaved };
}
