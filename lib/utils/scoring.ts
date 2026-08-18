import type { ExamSubmission, Participant, RankingEntry } from "@/lib/types/database";

// =============================================
// Score Calculation
// =============================================

/**
 * Calculate percentage score
 */
export function calculatePercentage(score: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((score / total) * 100 * 100) / 100;
}

/**
 * Format duration from seconds to MM:SS
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Format duration from seconds to human readable
 */
export function formatDurationHuman(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}j ${mins}m ${secs}d`;
  if (mins > 0) return `${mins}m ${secs}d`;
  return `${secs}d`;
}

// =============================================
// Ranking
// =============================================

interface SubmissionForRanking {
  participant: Participant;
  submission: ExamSubmission;
}

/**
 * Sort submissions by:
 * 1. total_score DESC
 * 2. submitted_at ASC (fastest submission time wins tiebreak)
 */
export function rankSubmissions(entries: SubmissionForRanking[]): RankingEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.submission.total_score !== a.submission.total_score) {
      return b.submission.total_score - a.submission.total_score;
    }
    // Tiebreak: earlier submission wins
    const timeA = a.submission.submitted_at ? new Date(a.submission.submitted_at).getTime() : Infinity;
    const timeB = b.submission.submitted_at ? new Date(b.submission.submitted_at).getTime() : Infinity;
    return timeA - timeB;
  });

  // Assign ranks, detect ties
  return sorted.map((entry, idx) => {
    const prevEntry = sorted[idx - 1];
    const isTie = idx > 0 && prevEntry
      ? prevEntry.submission.total_score === entry.submission.total_score
      : false;
    const rank = idx + 1;

    return {
      rank,
      participant: entry.participant,
      submission: entry.submission,
      is_tie: isTie,
    };
  });
}

/**
 * Get top N ranked participants
 */
export function getTopN(rankings: RankingEntry[], n: number): RankingEntry[] {
  return rankings.slice(0, n);
}

/**
 * Check if two submissions are tied
 */
export function isTiedWith(a: ExamSubmission, b: ExamSubmission): boolean {
  return a.total_score === b.total_score;
}
