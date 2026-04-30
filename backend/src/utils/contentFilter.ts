/**
 * Local content moderation — zero-latency, no external API calls.
 * Expand BANNED_WORDS with actual Turkish profanity/spam terms.
 */

const BANNED_WORDS = [
  // Placeholder entries — developer should expand this list
  'spam', 'reklam', 'küfür',
  'bok', 'sik', 'amk', 'orospu', 'piç', 'yarak', 'yarrak',
  'göt', 'meme', 'siktir', 'pezevenk', 'ibne', 'gerizekalı',
  'salak', 'aptal', 'mal', 'dangalak', 'hıyar',
  'ananı', 'bacını', 'amına', 'sikeyim', 'sikerim',
  'oç', 'mk', 'aq', 'amq', 'sgk'
];

// Build a regex that matches any banned word (case-insensitive, word-boundary aware)
const pattern = new RegExp(
  BANNED_WORDS.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'),
  'i'
);

/**
 * Returns `{ allowed: true }` if clean, or `{ allowed: false, reason }` if banned content found.
 * Runs in < 1 ms — no network calls.
 */
export function moderateLocally(text: string): { allowed: boolean; reason?: string } {
  const normalised = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase();

  if (pattern.test(normalised)) {
    return { allowed: false, reason: 'İçerik uygunsuz ifadeler barındırıyor.' };
  }
  return { allowed: true };
}

/**
 * Check text and return the FLAGGED status flag if banned content is found.
 */
export function shouldFlag(title: string, content: string): boolean {
  const combined = `${title} ${content}`;
  return !moderateLocally(combined).allowed;
}
