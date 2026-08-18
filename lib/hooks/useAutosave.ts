"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutosaveOptions {
  submissionId: string;
  debounceMs?: number;
}

export function useAutosave({ submissionId, debounceMs = 1500 }: UseAutosaveOptions) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const supabase = createClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAnswers = useRef<Map<string, string | null>>(new Map());

  const saveAnswer = useCallback(
    (questionId: string, selectedAnswer: string | null) => {
      // Merge into pending map
      pendingAnswers.current.set(questionId, selectedAnswer);
      setStatus("saving");

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(async () => {
        const entries = Array.from(pendingAnswers.current.entries());
        pendingAnswers.current.clear();

        try {
          for (const [qId, answer] of entries) {
            await supabase.from("exam_answers").upsert({
              submission_id: submissionId,
              question_id: qId,
              selected_answer: answer,
              answered_at: answer ? new Date().toISOString() : null,
            }, { onConflict: "submission_id,question_id" });
          }
          setStatus("saved");
          setTimeout(() => setStatus("idle"), 2000);
        } catch {
          setStatus("error");
        }
      }, debounceMs);
    },
    [supabase, submissionId, debounceMs]
  );

  const saveAllImmediately = useCallback(
    async (answers: Map<string, string | null>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setStatus("saving");

      try {
        const upserts = Array.from(answers.entries()).map(([qId, answer]) => ({
          submission_id: submissionId,
          question_id: qId,
          selected_answer: answer,
          answered_at: answer ? new Date().toISOString() : null,
        }));

        if (upserts.length > 0) {
          await supabase.from("exam_answers").upsert(upserts, {
            onConflict: "submission_id,question_id",
          });
        }
        setStatus("saved");
      } catch {
        setStatus("error");
        throw new Error("Failed to save answers");
      }
    },
    [supabase, submissionId]
  );

  return { saveAnswer, saveAllImmediately, status };
}
