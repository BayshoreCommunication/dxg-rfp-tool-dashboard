'use client';

// Chat-first AI workspace for creating a proposal. Full-page layout: breadcrumb
// top bar, centered greeting empty state with a single composer, a threaded
// conversation once work starts, and a right rail (sources, suggested tasks,
// suggested questions) that slides in once the conversation has begun. Files
// picked via the paperclip or the rail are STAGED as chips in the composer and
// only uploaded when the message is sent. No proposal exists until the user
// first sends a message or saves notes — then one is created lazily and the
// URL is replaced with that proposal's canonical assistant route
// (/proposals/{id}/assistant), which is also how an existing proposal's
// assistant is reached.

import {
  closeConversationSegmentAction,
  type ConversationMessage,
  type ConversationQuestion,
  type ConversationQuestionAnswer,
  type ConversationRunType,
} from '@/app/actions/conversation';
import {
  deletePrivateDocumentSource,
  type PrivateDocumentSource,
} from '@/app/actions/durableJobs';
import GlobalDateInput from '@/components/shared/GlobalDateInput';
import { getCandidateReviewAction } from '@/app/actions/candidateApplication';
import {
  generateGuidanceAction,
  getLatestGuidanceAction,
  type GuidanceReport,
  type GuidanceSectionCompleteness,
} from '@/app/actions/guidance';
import {
  generateInvestmentGuidanceAction,
  getLatestInvestmentGuidanceAction,
  type InvestmentReport,
} from '@/app/actions/investment';
import {
  getLatestProposalContextAction,
  getProposalContextAction,
} from '@/app/actions/proposalContext';
import {
  getProposalDraftAction,
  type ProposalDraftSection,
} from '@/app/actions/proposalDraft';
import {
  createProposalAction,
  getProposalByIdAction,
} from '@/app/actions/proposals';
import { getUserData } from '@/app/actions/user';
import AssistantOrb from '@/components/ai/shared/AssistantOrb';
import TypingIndicator from '@/components/ai/shared/TypingIndicator';
import type { ProposalData } from '@/components/proposals/AddNewProposal';
import { presentJob } from '@/lib/asyncOperations';
import {
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Download,
  FileText,
  Loader2,
  Mic,
  Square,
  Paperclip,
  PencilLine,
  Sparkles,
  StickyNote,
  Upload,
  X,
} from 'lucide-react';
import Link from 'next/link';
import {
  isRetiredStandaloneRecordingFinding,
  stepForPath,
} from './GuidancePanel';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  useAutoExtraction,
  useConversation,
  useNotesScan,
  useProposalSources,
  useSourceUpload,
} from './useConversation';
import { takeProposalHandoffDraft } from '@/lib/aiAssistant/handoff';
import {
  isStandaloneVideoRecordingPath,
  STANDALONE_VIDEO_RECORDING_STEP_ENABLED,
} from '@/lib/proposals/proposalExperience';

type SpeechRecognitionResultLike = {
  0: { transcript: string };
  isFinal?: boolean;
};
type SpeechRecognitionEventLike = {
  resultIndex?: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
export type SpeechTranscriptSegment = {
  transcript: string;
  isFinal: boolean;
};
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
};

const FIELD_COMMAND = /\b(fill|set|apply|enter|put|answer|update)\b/i;
const FIELD_HELP_COMMAND = /^(?:please\s+)?(?:help|hint|show\s+(?:me\s+)?(?:a\s+)?hint|how\s+(?:do|should|can)\s+i\s+(?:answer|say|fill)(?:\s+this)?|what\s+should\s+i\s+say|(?:eta|eita|এটা|এটি)\s+(?:kivabe|কীভাবে|কিভাবে)\s+(?:bolbo|বলব|fill\s+korbo|ফিল\s+করব))\??$/i;

export type ProposalWorkspaceAction =
  | 'generate_draft'
  | 'edit_details'
  | 'readiness'
  | 'investment'
  | 'download_sample'
  | 'open_room_specifications'
  | 'use_messages'
  | 'extract_requirements'
  | 'show_actions';

export const proposalWorkspaceActionFromInstruction = (
  input: string,
): ProposalWorkspaceAction | null => {
  const value = comparableWords(input);
  if (/^(?:please )?(?:generate|regenerate|create|make)(?: the| my| proposal)? draft$/.test(value)) return 'generate_draft';
  if (/^(?:please )?(?:edit|open|update|change)(?: all| my| proposal)? details$/.test(value) || /^(?:please )?open(?: the)? proposal editor$/.test(value)) return 'edit_details';
  if (/^(?:please )?(?:run|do|start|check)(?: the| my| proposal)? readiness(?: check)?$/.test(value)) return 'readiness';
  if (/^(?:please )?(?:run|show|get|open)(?: the)? investment guidance$/.test(value)) return 'investment';
  if (/^(?:please )?(?:download|get)(?: the)? (?:sample|schedule)(?: sheet| template)$/.test(value)) return 'download_sample';
  if (/^(?:please )?(?:open|go to)(?: the)? room specifications(?: and upload)?$/.test(value)) return 'open_room_specifications';
  if (/^(?:please )?use what i (?:(?:have|ve) )?told you$/.test(value)) return 'use_messages';
  if (/^(?:please )?(?:extract|read)(?: the)? requirements$/.test(value)) return 'extract_requirements';
  if (/^(?:please )?(?:show|list|tell me)(?: the| my)? (?:available )?(?:actions|options|commands)$/.test(value) || /^what can i (?:do|say) now$/.test(value)) return 'show_actions';
  return null;
};
const MONTH_NUMBER: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

export const naturalDateToIso = (
  input: string,
  referenceDate = new Date(),
): string | null => {
  const normalized = input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/(\d{4})([A-Za-z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\b(?:of|in)\b/g, ' ')
    .replace(/,/g, ' ');
  const relativeDays = /\bday after tomorrow\b/.test(normalized)
    ? 2
    : /\btomorrow\b/.test(normalized)
      ? 1
      : /\btoday\b/.test(normalized)
        ? 0
        : null;
  if (relativeDays !== null) {
    const relative = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate() + relativeDays,
    );
    return `${relative.getFullYear()}-${String(relative.getMonth() + 1).padStart(2, '0')}-${String(relative.getDate()).padStart(2, '0')}`;
  }
  const iso = input.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  let year: number;
  let month: number;
  let day: number;
  if (iso) {
    [, year, month, day] = iso.map(Number);
  } else {
    // Do not turn a clipped speech-recognition year such as "August 21 202"
    // into a confident date. The composer will ask the planner to repeat it.
    if (
      /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)[,\s]+\d{1,2}(?:st|nd|rd|th)?[,]?\s+\d{1,3}\b/i.test(input) ||
      /\b\d{1,2}(?:st|nd|rd|th)?\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)[,]?\s+\d{1,3}\b/i.test(input)
    ) return null;
    const yearFirst = normalized.match(
      new RegExp(`\\b(\\d{4})\\s+(${Object.keys(MONTH_NUMBER).join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, 'i'),
    );
    const dayFirst = normalized.match(
      /\b(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december)(?:,?\s+(\d{4}))?\b/i,
    );
    const monthFirst = normalized.match(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/i,
    );
    const numeric = normalized.match(/\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/);
    if (yearFirst) {
      year = Number(yearFirst[1]);
      month = MONTH_NUMBER[yearFirst[2].toLowerCase()];
      day = Number(yearFirst[3]);
    } else if (dayFirst) {
      day = Number(dayFirst[1]);
      month = MONTH_NUMBER[dayFirst[2].toLowerCase()];
      year = dayFirst[3] ? Number(dayFirst[3]) : referenceDate.getFullYear();
    } else if (monthFirst) {
      month = MONTH_NUMBER[monthFirst[1].toLowerCase()];
      day = Number(monthFirst[2]);
      year = monthFirst[3] ? Number(monthFirst[3]) : referenceDate.getFullYear();
    } else if (numeric) {
      const first = Number(numeric[1]);
      const second = Number(numeric[2]);
      if (first <= 12 && second <= 12) return null;
      day = first > 12 ? first : second;
      month = first > 12 ? second : first;
      year = Number(numeric[3]);
    } else {
      return null;
    }
  }
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }
  return `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

export const naturalTimeTo24Hour = (input: string): string | null => {
  const normalized = input
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/(\d{4})([A-Za-z])/g, '$1 $2');
  if (/\bnoon\b/i.test(normalized)) return '12:00';
  if (/\bmidnight\b/i.test(normalized)) return '00:00';
  const matches = normalized.matchAll(
    /\b(\d{1,2})(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)?\b/gi,
  );
  for (const match of matches) {
    let hour = Number(match[1]);
    const minute = Number(match[2] ?? '00');
    const meridiem = match[3]?.replaceAll('.', '').toLowerCase();
    if (!match[2] && !meridiem) continue;
    if (meridiem) {
      if (hour < 1 || hour > 12) continue;
      if (meridiem === 'pm' && hour !== 12) hour += 12;
      if (meridiem === 'am' && hour === 12) hour = 0;
    } else if (hour > 23) {
      continue;
    }
    return `${hour.toString().padStart(2, '0')}:${minute
      .toString()
      .padStart(2, '0')}`;
  }
  return null;
};

const looksLikeDateInstruction = (input: string) =>
  new RegExp(`\\b(?:${Object.keys(MONTH_NUMBER).join('|')})\\b`, 'i').test(input) ||
  /\b(today|tomorrow|day after tomorrow)\b/i.test(input) ||
  /\b(?:\d{4}[-/.]\d{1,2}(?:[-/.]\d{0,2})?|\d{1,2}[/.]\d{1,2}[/.]\d{2,4})\b/.test(input);

const comparableWords = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const normalizedSpeechSegment = (value: string) =>
  value.replace(/\s+/g, ' ').trim();

const appendSpeechSegment = (current: string, next: string) => {
  if (!current) return next;
  if (!next) return current;

  const currentWords = current.split(' ');
  const nextWords = next.split(' ');
  const largestPossibleOverlap = Math.min(
    currentWords.length,
    nextWords.length,
  );
  let overlap = 0;
  for (let size = largestPossibleOverlap; size > 0; size -= 1) {
    const currentSuffix = currentWords.slice(-size).join(' ').toLowerCase();
    const nextPrefix = nextWords.slice(0, size).join(' ').toLowerCase();
    if (currentSuffix === nextPrefix) {
      overlap = size;
      break;
    }
  }
  return [...currentWords, ...nextWords.slice(overlap)].join(' ');
};

/**
 * Android Chrome may retain several superseded interim hypotheses in one
 * SpeechRecognition result list. Keep every final segment, only the newest
 * interim segment, and merge any overlapping boundary instead of rendering
 * each hypothesis as new dictated text.
 */
export const speechTranscriptFromSegments = (
  segments: ReadonlyArray<SpeechTranscriptSegment | undefined>,
) => {
  const finalSegments: string[] = [];
  let latestInterim = '';

  for (const segment of segments) {
    const transcript = normalizedSpeechSegment(segment?.transcript ?? '');
    if (!transcript) continue;
    if (segment?.isFinal) {
      finalSegments.push(transcript);
      // Some Android implementations leave superseded interim entries before
      // the newly finalized result. That final result replaces those drafts.
      latestInterim = '';
    } else latestInterim = transcript;
  }

  return [...finalSegments, latestInterim]
    .filter(Boolean)
    .reduce(appendSpeechSegment, '');
};

const SKIP_VERB = '(?:skip|skib|pass)';
const SKIP_TARGET =
  '(?:it|this|that|this one|that one|the question|this question|that question|the current question|current question)';
const SKIP_FILLER_PREFIX = '(?:(?:ok|okay|well|uh|um|hey) )?';
const DIRECT_SKIP_INSTRUCTION = new RegExp(
  `^${SKIP_FILLER_PREFIX}(?:please )?(?:just )?${SKIP_VERB}(?: ${SKIP_TARGET})?(?: (?:now|for now))?(?: please)?$`,
);
const REQUESTED_SKIP_INSTRUCTION = new RegExp(
  `^${SKIP_FILLER_PREFIX}(?:please )?(?:(?:i|we) (?:want|need) to|i would like to|id like to|i wanna|lets|let us|(?:can|could|would|will) (?:you|we)(?: please)?) ${SKIP_VERB}(?: ${SKIP_TARGET})?(?: (?:now|for now))?(?: please)?$`,
);
const NEXT_QUESTION_INSTRUCTION = new RegExp(
  `^${SKIP_FILLER_PREFIX}(?:please )?(?:(?:go|move)(?: on)? to (?:the )?next(?: question)?|move on|continue(?: to (?:the )?next question)?|(?:the )?next(?: question)?)(?: now)?(?: please)?$`,
);
const NEGATED_SKIP_INSTRUCTION = new RegExp(
  `\\b(?:do not|dont|never)(?: (?:want|need|mean|plan|intend|like|think|i|we|you|to|should|could|would)){0,6} ${SKIP_VERB}\\b|\\bnot (?:to )?${SKIP_VERB}\\b`,
);

/**
 * Treats a concise natural instruction as the active question's Skip action.
 * Keep this intentionally narrower than fuzzy chat matching so an answer that
 * merely mentions "skip" is never discarded by accident.
 */
export const isSkipQuestionInstruction = (input: string) => {
  const normalized = comparableWords(input.replace(/[’']/g, ''));
  if (!normalized || NEGATED_SKIP_INSTRUCTION.test(normalized)) return false;
  return (
    DIRECT_SKIP_INSTRUCTION.test(normalized) ||
    REQUESTED_SKIP_INSTRUCTION.test(normalized) ||
    NEXT_QUESTION_INSTRUCTION.test(normalized)
  );
};

const cleanSpeechCandidate = (value: string) => {
  const words = value.trim().split(/\s+/);
  return words.reduce<string[]>((cleaned, word) => {
    if (cleaned.at(-1)?.toLowerCase() === word.toLowerCase()) {
      cleaned[cleaned.length - 1] = word;
    } else {
      cleaned.push(word);
    }
    return cleaned;
  }, []).join(' ');
};

const ALIAS_STOP_WORDS = new Set([
  'what', 'which', 'when', 'where', 'how', 'many', 'much', 'does', 'will',
  'would', 'should', 'could', 'this', 'that', 'there', 'event', 'please',
  'provide', 'enter', 'add', 'use', 'still', 'expected', 'required', 'host',
  'need', 'needs', 'called', 'planning', 'selected', 'example', 'ambiguous',
  'person',
]);

export const questionFieldContract = (question: ConversationQuestion) => {
  const leaf = question.paths.at(-1)?.split('/').at(-1) ?? '';
  const pathWords = comparableWords(leaf.replace(/([a-z])([A-Z])/g, '$1 $2'));
  const pathTokens = pathWords.split(' ').filter(Boolean);
  const promptBase = question.prompt.split(/[?(]/)[0];
  const promptTokens = comparableWords(promptBase)
    .split(' ')
    .filter((word) => word.length >= 4 && !ALIAS_STOP_WORDS.has(word));
  const promptPhrases = promptTokens.flatMap((word, index) => [
    word,
    ...(index < promptTokens.length - 1 ? [`${word} ${promptTokens[index + 1]}`] : []),
  ]);
  const pathSuffixes = pathTokens.flatMap((_, index) => {
    const suffix = pathTokens.slice(index).join(' ');
    if (suffix.length < 3) return [];
    if (['name', 'date', 'time', 'type', 'status', 'required'].includes(suffix)) return [];
    return [suffix];
  });
  const distinctivePathTokens = pathTokens.filter(
    (word) => word.length >= 3 && !['name', 'date', 'time', 'type', 'status', 'required', 'number'].includes(word),
  );
  const aliases = [...new Set([
    pathWords,
    comparableWords(questionFieldLabel(question)),
    ...pathSuffixes,
    ...distinctivePathTokens,
    ...promptPhrases,
  ].filter((value) => value.length >= 3))].sort((a, b) => b.length - a.length);
  return {
    modelPath: question.paths,
    modelName: leaf,
    label: questionFieldLabel(question),
    prompt: question.prompt,
    answerType: question.answerType,
    options: question.options,
    aliases,
  };
};

export const questionAnswerHint = (question: ConversationQuestion): string => {
  const label = questionFieldLabel(question);
  const pathName = question.paths.at(-1)?.split('/').at(-1) ?? '';
  const effectiveType = question.answerType === 'text'
    ? /^numberOf/i.test(pathName)
      ? 'number'
      : /Date$/i.test(pathName)
        ? 'date'
        : /Time$/i.test(pathName)
          ? 'time'
          : 'text'
    : question.answerType;
  if (effectiveType === 'choice') {
    return `Choose or say one of: ${question.options.join(', ')}.`;
  }
  if (effectiveType === 'date_time') {
    return `For ${label}, say for example: “20 August 2026 at 3 PM”.`;
  }
  if (effectiveType === 'date') {
    return `For ${label}, say for example: “20 August 2026”, “2026-08-20”, or “tomorrow”.`;
  }
  if (effectiveType === 'time') {
    return `For ${label}, say for example: “3 PM”, “15:00”, “noon”, or “midnight”.`;
  }
  if (effectiveType === 'number') {
    return `For ${label}, say just the number or a short phrase, for example: “300” or “three hundred”.`;
  }
  return `For ${label}, give a short direct answer using the wording in this question. For example: “${label} is …”. You can also say “skip”.`;
};

const mentionedChoice = (options: string[], input: string) => {
  const words = ` ${comparableWords(input)} `;
  return options.find((option) =>
    words.includes(` ${comparableWords(option)} `),
  ) ?? null;
};

const NUMBER_WORDS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

const naturalNumber = (input: string): string | null => {
  const digits = input.match(/\b\d+(?:\.\d+)?\b/)?.[0];
  if (digits) return digits;
  const tokens = comparableWords(input).split(' ');
  let total = 0;
  let current = 0;
  let found = false;
  for (const token of tokens) {
    if (token === 'and') continue;
    if (token in NUMBER_WORDS) {
      current += NUMBER_WORDS[token];
      found = true;
    } else if (token === 'hundred' && found) {
      current = Math.max(current, 1) * 100;
    } else if (token === 'thousand' && found) {
      total += Math.max(current, 1) * 1000;
      current = 0;
    } else if (found) {
      break;
    }
  }
  return found ? String(total + current) : null;
};

export const fieldAnswerFromInstruction = (
  question: ConversationQuestion,
  instruction: string,
): ConversationQuestionAnswer | null => {
  const input = instruction.trim();
  if (!input) return null;
  const pathName = question.paths.at(-1)?.split('/').at(-1) ?? '';
  const conciseBoolean = comparableWords(input);
  if (
    question.answerType === 'text' &&
    /^(?:are|is|do|does|will|would|should|must|can)\b/i.test(question.prompt.trim()) &&
    /^(yes|no|none|not sure)$/.test(conciseBoolean)
  ) {
    return conciseBoolean === 'none'
      ? 'None'
      : conciseBoolean.replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
  if (question.answerType === 'date' || /Date$/i.test(pathName)) {
    const naturalDate = naturalDateToIso(input);
    if (naturalDate) return naturalDate;
  }
  if (question.answerType === 'time') {
    const naturalTime = naturalTimeTo24Hour(input);
    if (naturalTime) return naturalTime;
  }
  if (question.answerType === 'date_time') {
    const date = naturalDateToIso(input);
    const time = naturalTimeTo24Hour(input);
    if (date && time) return { date, time };
  }
  if (question.answerType === 'choice') {
    const mentioned = mentionedChoice(question.options, input);
    // The active guided question supplies field context. A backend-provided
    // option appearing in a short/natural reply is therefore enough; the
    // frontend never needs a hard-coded event-format or yes/no list.
    if (mentioned) {
      return mentioned;
    }
  }
  // Older persisted guidance rows may predate typed controls and still report
  // `text`. A canonical numberOf* path is nevertheless unambiguously numeric.
  if (question.answerType === 'number' || /^numberOf/i.test(pathName)) {
    const number = naturalNumber(input);
    const fieldStem = pathName.replace(/numberOf/i, '').replace(/([A-Z])/g, ' $1').trim();
    const conciseReply = input.split(/\s+/).length <= 8 && !input.includes('?');
    if (number && (FIELD_COMMAND.test(input) || new RegExp(fieldStem, 'i').test(input) || conciseReply)) {
      return number;
    }
  }
  // Browser speech recognition often joins the copula to the next word
  // ("event name isAttack") or repeats nearby prompt words. Since the active
  // question supplies unambiguous field context, handle these common event-name
  // utterances before the generic command grammar.
  if (/eventName$/i.test(pathName)) {
    const eventNamePatterns = [
      /\b(?:event\s+)+(?:name\s*)?(?:is\s*|=\s*|:\s*|to\s+)(.+)$/i,
      /\bname\s*(?:is\s*|=\s*|:\s*|to\s+)(.+)$/i,
      /\bevent(?:\s+event)*\s+called(?:\s+name)?\s*(?:is\s*)?(.+)$/i,
    ];
    for (const pattern of eventNamePatterns) {
      const matched = input.match(pattern)?.[1]
        ?.replace(/\s+(please|for me)$/i, '')
        .trim();
      if (matched) return cleanSpeechCandidate(matched).slice(0, 4000);
    }
  }
  // The visible question can define a natural relationship even when the
  // answer comes before the label: "Data Path will host the event". This is
  // derived from the active prompt (not a backend field-name special case), so
  // a renamed model path continues to work with the same frontend wording.
  if (
    question.answerType === 'text' &&
    /\bhost\b.*\bevent\b/i.test(question.prompt) &&
    !input.includes('?')
  ) {
    const reverseHostPatterns = [
      /^(.+?)\s+(?:is|will\s+be)\s+(?:the\s+)?(?:place\s+)?(?:that\s+)?(?:will\s+)?host(?:ing)?\s+(?:the\s+)?event\b/i,
      /^(.+?)\s+(?:will\s+)?host(?:s|ing)?\s+(?:the\s+)?event\b/i,
      /^(?:the\s+)?event\s+(?:is|will\s+be)\s+(?:hosted\s+)?at\s+(.+)$/i,
    ];
    for (const pattern of reverseHostPatterns) {
      const matched = input.match(pattern)?.[1]?.trim();
      if (matched) return cleanSpeechCandidate(matched).slice(0, 4000);
    }
  }
  const aliases = questionFieldContract(question).aliases
    .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const mentionsField = aliases.some((alias) =>
    new RegExp(`\\b${alias}\\b`, 'i').test(input),
  );
  const explicitCommand = FIELD_COMMAND.test(input);
  const assignsMentionedField = mentionsField && /\b(is|are|equals|to|as|will be)\b|=|:/i.test(input);
  const conciseContextualText =
    question.answerType === 'text' &&
    input.split(/\s+/).length <= 6 &&
    !input.includes('?') &&
    !/^(?:plan|create|make|generate|check|review|help|explain|show|tell|what|why|how|can|could|would|please)\b/i.test(input);
  if (!explicitCommand && !assignsMentionedField && !conciseContextualText) return null;

  let candidate = input
    .replace(/^(please\s+)?(can you\s+)?/i, '')
    .replace(/\b(fill|set|apply|enter|put|answer|update)\b(\s+(in|up|the|this|current|input|field|box))*\s*/gi, '')
    .trim();
  for (const alias of aliases) {
    const stripped = candidate
      .replace(new RegExp(`^(the\\s+)?${alias}(?:\\s+name)?\\s*(is|are|will\\s+be|=|to|as|with|:)\\s*`, 'i'), '')
      .replace(new RegExp(`^(the\\s+)?${alias}\\s+`, 'i'), '')
      .trim();
    if (stripped !== candidate) {
      candidate = stripped;
      break;
    }
  }
  candidate = candidate
    .replace(/^(is|are|will\s+be|=|to|as|with|:)\s*/i, '')
    .replace(/\s+(please|for me)$/i, '')
    .trim();
  if (!candidate || /^(it|this|that|input|field|box)$/i.test(candidate)) return null;

  if (question.answerType === 'choice') {
    return mentionedChoice(question.options, candidate);
  }
  if (question.answerType === 'number') {
    return naturalNumber(candidate);
  }
  if (question.answerType === 'date') {
    return naturalDateToIso(candidate);
  }
  if (question.answerType === 'time') {
    return candidate.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/)?.[0] ?? null;
  }
  if (question.answerType === 'date_time') return null;
  return cleanSpeechCandidate(candidate).slice(0, 4000);
};

export const mentionedFieldAnswers = (
  questions: ConversationQuestion[],
  instruction: string,
): Array<{ question: ConversationQuestion; answer: ConversationQuestionAnswer }> => {
  const normalized = comparableWords(instruction);
  const located = questions.flatMap((question) => {
    const positions = questionFieldContract(question).aliases
      .map((alias) => normalized.indexOf(alias))
      .filter((position) => position >= 0);
    const position = positions.length ? Math.min(...positions) : -1;
    return position >= 0 ? [{ question, position }] : [];
  }).sort((a, b) => a.position - b.position);

  const explicit = located.flatMap((item, index) => {
    const end = located[index + 1]?.position ?? normalized.length;
    const segment = normalized.slice(item.position, end).trim();
    const answer = fieldAnswerFromInstruction(item.question, segment);
    return answer === null ? [] : [{ question: item.question, answer }];
  });

  // Natural speech rarely repeats form labels. A planner is more likely to
  // say "The event is Horizon Summit, an in-person conference at Javits in
  // New York, from 21 August to 22 August, with 300 attendees." Infer the
  // remaining values from the live question prompts, answer types and options
  // so renamed frontend labels/backend paths continue to drive the mapping.
  const claimed = new Set(explicit.map(item => item.question.id));
  const inferred: Array<{ question: ConversationQuestion; answer: ConversationQuestionAnswer }> = [];
  const add = (question: ConversationQuestion, answer: ConversationQuestionAnswer | null) => {
    if (answer === null || claimed.has(question.id)) return;
    claimed.add(question.id);
    inferred.push({ question, answer });
  };

  for (const question of questions) {
    if (claimed.has(question.id)) continue;
    if (question.answerType === 'choice') {
      add(question, mentionedChoice(question.options, instruction));
      continue;
    }
    const pathName = question.paths.at(-1)?.split('/').at(-1) ?? '';
    if (question.answerType === 'number' || /^numberOf/i.test(pathName)) {
      const aliases = questionFieldContract(question).aliases;
      const aliasPositions = aliases.flatMap(alias => {
        const position = normalized.indexOf(alias);
        return position >= 0 ? [position] : [];
      });
      const numericMentions = [...normalized.matchAll(/\b\d+(?:\.\d+)?\b/g)];
      const nearest = aliasPositions.length
        ? numericMentions
            .map(match => ({
              value: match[0],
              distance: Math.min(...aliasPositions.map(position => Math.abs((match.index ?? 0) - position))),
            }))
            .sort((a, b) => a.distance - b.distance)[0]
        : null;
      add(
        question,
        nearest && nearest.distance <= 24
          ? nearest.value
          : fieldAnswerFromInstruction(question, instruction),
      );
    }
  }

  const monthNames = Object.keys(MONTH_NUMBER).join('|');
  const datePattern = new RegExp(
    `\\b(?:\\d{4}[-/.]\\d{1,2}[-/.]\\d{1,2}|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${monthNames})(?:,?\\s+\\d{4})?|(?:${monthNames})\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?)\\b`,
    'gi',
  );
  const mentionedDates = [...instruction.matchAll(datePattern)].flatMap(match => {
    const value = naturalDateToIso(match[0]);
    return value ? [value] : [];
  });
  if (/\bfrom\b[\s\S]*\b(?:to|through|until)\b/i.test(instruction) && mentionedDates.length >= 2) {
    const dateQuestions = questions.filter(question => {
      const pathName = question.paths.at(-1)?.split('/').at(-1) ?? '';
      return question.answerType === 'date' || /Date$/i.test(pathName);
    });
    const startQuestion = dateQuestions.find(question => /\bstart\b/i.test(`${question.prompt} ${questionFieldLabel(question)}`));
    const endQuestion = dateQuestions.find(question => /\bend\b/i.test(`${question.prompt} ${questionFieldLabel(question)}`));
    if (startQuestion) add(startQuestion, mentionedDates[0]);
    if (endQuestion) add(endQuestion, mentionedDates[1]);
  }

  for (const question of questions) {
    if (claimed.has(question.id) || question.answerType !== 'text') continue;
    const wording = comparableWords(`${question.prompt} ${questionFieldLabel(question)}`);
    if (/\b(?:called|event name)\b/.test(wording)) {
      const name = instruction.match(
        /\b(?:the\s+)?event\s+(?:is|called)\s+(.+?)(?=,\s*(?:an?|the|from|at|in|with)\b|$)/i,
      )?.[1]?.trim();
      if (name) add(question, cleanSpeechCandidate(name).slice(0, 4000));
      continue;
    }
    if (/\bcity\b/.test(wording) && /\bhost\b/.test(wording)) {
      const city = instruction.match(
        /\bin\s+(.+?)(?=,\s*(?:from|with)\b|\s+from\b|$)/i,
      )?.[1]?.trim();
      if (city && !/^(?:person|house)$/i.test(city)) {
        add(question, cleanSpeechCandidate(city).slice(0, 4000));
      }
      continue;
    }
    if (/\bvenue\b/.test(wording) && /\bhost\b/.test(wording)) {
      const venue = instruction.match(
        /\bat\s+(.+?)(?=\s+in\s+|,\s*(?:from|with)\b|$)/i,
      )?.[1]?.trim();
      if (venue) add(question, cleanSpeechCandidate(venue).slice(0, 4000));
    }
  }

  const questionOrder = new Map(questions.map((question, index) => [question.id, index]));
  return [...explicit, ...inferred].sort(
    (a, b) => (questionOrder.get(a.question.id) ?? 0) - (questionOrder.get(b.question.id) ?? 0),
  );
};

const ACCENT = '#00c2c9';
const DEEP = '#087f69';

const runLabels: Record<
  ConversationRunType,
  { pending: string; failed: string }
> = {
  proposal_context: {
    pending: 'Extracting requirements…',
    failed: 'Requirement extraction did not finish. Try again.',
  },
  proposal_draft: {
    pending: 'Drafting the proposal…',
    failed: 'Draft generation did not finish. Try again.',
  },
};

const taskContent: Record<
  'extract_requirements' | 'generate_draft',
  string
> = {
  extract_requirements:
    'Extract the requirements from the selected sources.',
  generate_draft:
    'Generate a proposal draft from the current information.',
};

type LocalCard =
  | { id: string; kind: 'guidance'; report: GuidanceReport }
  | { id: string; kind: 'investment'; report: InvestmentReport }
  // Extraction from typed messages happens in the background, so without a
  // card the planner sees sources and applied fields appear from nowhere.
  | { id: string; kind: 'segment'; created: boolean; reason?: string }
  // A skipped question otherwise vanishes: nothing records it and the only way
  // back is to know which editor page owns the field.
  | {
      id: string;
      kind: 'skipped';
      label: string;
      step?: number;
      stepLabel?: string;
    }
  | { id: string; kind: 'error'; message: string };

// Why a "use what I've told you" request produced nothing. Deliberately plain:
// none of these are failures, and the planner should not be made to feel one
// happened.
// Mirrors the backend's CONVERSATION_EXTRACTION_ENABLED gate. Offering the
// task while the gate is closed spends a planner's click to tell them the
// feature is off; the reason belongs on the control instead. Read per render
// so the flag can be flipped without a rebuild.
// A successful retry supersedes an earlier failed attempt of the same run
// type. Keeping the old red alert beside the finished draft makes the current
// state look contradictory even though the audit history remains persisted.
export const visibleRunMessages = (
  messages: ConversationMessage[],
): ConversationMessage[] => {
  const latestComplete = new Map<ConversationRunType, number>();
  for (const message of messages) {
    if (message.runType && message.status === 'complete') {
      latestComplete.set(
        message.runType,
        Math.max(
          latestComplete.get(message.runType) ?? -1,
          message.ordinal,
        ),
      );
    }
  }
  return messages.filter(
    (message) =>
      !(
        message.runType &&
        message.status === 'failed' &&
        (latestComplete.get(message.runType) ?? -1) > message.ordinal
      ),
  );
};

// A run-result message is inserted immediately after the action-request that
// created it. Keeping this relationship in the conversation history lets a
// failed extraction be retried from the already-scanned sources, without
// asking the planner to upload the same files again.
export const sourceIdsForFailedExtraction = (
  messages: ConversationMessage[],
  failedRun: ConversationMessage,
): string[] => {
  const request = messages.find(
    (message) =>
      message.role === 'user' &&
      message.intent === 'extract_requirements' &&
      message.ordinal === failedRun.ordinal - 1,
  );
  return request?.attachments.map((attachment) => attachment.sourceId) ?? [];
};

const segmentSkipReasons: Record<string, string> = {
  open: "I'll use these once you pause or add a bit more.",
  insufficient:
    "There isn't enough detail in your messages yet for me to pull requirements from.",
  empty: 'Nothing new since the last time I read your messages.',
  disabled:
    "Reading requirements from chat isn't switched on in this environment.",
  ingestion_disabled:
    "Source handling isn't switched on in this environment.",
};

const impactLabels: Record<string, string> = {
  cost: 'affects cost',
  schedule: 'affects schedule',
  production: 'affects production',
  scope: 'affects scope',
};

// Short human label for a single-field question, e.g.
// "/content/venueSchedule/numberOfEventRooms" -> "Number of event rooms".
const questionFieldLabel = (
  question: ConversationQuestion,
): string => {
  if (
    question.answerType === 'date_time' &&
    isLoadInDateQuestion(question)
  )
    return 'Production load-in';
  const segment =
    question.paths.length === 1
      ? (question.paths[0].split('/').pop() ?? '')
      : '';
  if (!segment) return 'Answer';
  const words = segment
    .replace(/([A-Z])/g, ' $1')
    .toLowerCase()
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const citationLabel = (citation: string): string => {
  const segment =
    citation.split('/').filter(Boolean).pop() ?? citation;
  const labels: Record<string, string> = {
    aboutOrganization: 'Organization',
    editionYear: 'Edition / year',
    endDate: 'End date',
    eventFormat: 'Event format',
    eventName: 'Event name',
    eventObjectives: 'Event objectives',
    eventType: 'Event type',
    startDate: 'Start date',
    statementOfWork: 'Scope of work',
  };
  if (labels[segment]) return labels[segment];
  const words = segment
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim();
  return words
    ? words.charAt(0).toUpperCase() + words.slice(1)
    : 'Proposal detail';
};

// A picked calendar day submitted as YYYY-MM-DD from its LOCAL parts:
// toISOString() would shift the day for anyone behind UTC.
const localIsoDay = (date: Date): string => {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// ── Captured-detail summary ──────────────────────────────────────────────────
// The overview card reads the proposal document itself (legacy field names) and
// renders only the fields that actually carry a value.

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const PLACEHOLDER_EVENT_NAME = 'Untitled proposal';

export type OverviewRow = { label: string; value: string };

const textValue = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value))
    return String(value);
  return '';
};

type DayParts = { year: number; month: number; day: number };

// Dates are stored as plain strings ("2027-03-16"); they are read as calendar
// days so a timezone offset can never shift the rendered date.
const parseDay = (value: unknown): DayParts | null => {
  const raw = textValue(value);
  if (!raw) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) {
    const month = Number(iso[2]) - 1;
    const day = Number(iso[3]);
    if (month < 0 || month > 11 || day < 1 || day > 31) return null;
    return { year: Number(iso[1]), month, day };
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth(),
    day: parsed.getDate(),
  };
};

const formatDay = (parts: DayParts, withYear = true) =>
  `${parts.day} ${MONTHS[parts.month]}${withYear ? ` ${parts.year}` : ''}`;

// "16–18 Mar 2027" when both ends share a month, "28 Feb – 2 Mar 2027" within a
// year, otherwise both ends fully qualified.
const formatDateRange = (start: unknown, end: unknown): string => {
  const from = parseDay(start);
  const to = parseDay(end);
  if (!from && !to) return '';
  if (!from) return formatDay(to as DayParts);
  if (!to) return formatDay(from);
  if (from.year === to.year && from.month === to.month) {
    return from.day === to.day
      ? formatDay(from)
      : `${from.day}–${to.day} ${MONTHS[from.month]} ${from.year}`;
  }
  if (from.year === to.year)
    return `${formatDay(from, false)} – ${formatDay(to)}`;
  return `${formatDay(from)} – ${formatDay(to)}`;
};

const isYes = (value: unknown) =>
  textValue(value).toUpperCase() === 'YES';

const budgetTierLabel = (
  proposal: Record<string, unknown> | null,
): string => {
  if (!proposal) return '';
  const budget = isRecord(proposal.budget) ? proposal.budget : {};
  const tier = textValue(budget.estimatedAvBudget);
  const ranges: Record<string, string> = {
    Essential: '$10K – $25K',
    Standard: '$25K – $50K',
    Production: '$50K – $100K',
    Premium: '$100K – $250K',
    Enterprise: '$250K – $500K',
    Signature: '$500K+',
    'Not Yet Determined': 'Need guidance',
  };
  return tier
    ? `${tier}${ranges[tier] ? ` (${ranges[tier]})` : ''}`
    : '';
};

// Key captured details, in reading order, capped so the card stays scannable.
export const buildOverviewRows = (
  proposal: Record<string, unknown> | null,
): OverviewRow[] => {
  if (!proposal) return [];
  const event = isRecord(proposal.event) ? proposal.event : {};
  const venueSchedule = isRecord(proposal.venueSchedule)
    ? proposal.venueSchedule
    : {};
  const hybridVirtual = isRecord(proposal.hybridVirtual)
    ? proposal.hybridVirtual
    : {};
  const budget = isRecord(proposal.budget) ? proposal.budget : {};

  const rows: OverviewRow[] = [];
  const push = (label: string, value: string) => {
    if (value) rows.push({ label, value });
  };

  const eventName = textValue(event.eventName);
  push(
    'Event',
    eventName === PLACEHOLDER_EVENT_NAME ? '' : eventName,
  );
  push('Dates', formatDateRange(event.startDate, event.endDate));
  push('Format', textValue(event.eventFormat));
  push('Attendees', textValue(event.attendees));
  push('Venue', textValue(venueSchedule.venueName));
  push('City', textValue(venueSchedule.venueCity));
  push('Event rooms', textValue(venueSchedule.numberOfEventRooms));
  if (isYes(venueSchedule.isUnionVenue))
    rows.push({ label: 'Union venue', value: 'Yes' });
  push(
    'Streaming platform',
    textValue(hybridVirtual.streamingPlatform),
  );
  if (STANDALONE_VIDEO_RECORDING_STEP_ENABLED) {
    const videoRecording = isRecord(proposal.videoRecordingStep)
      ? proposal.videoRecordingStep
      : {};
    if (isYes(videoRecording.videoRecordingRequired)) {
      const cameras = textValue(videoRecording.numberOfCameras);
      rows.push({
        label: 'Video recording',
        value: cameras
          ? `Yes — ${cameras} camera${cameras === '1' ? '' : 's'}`
          : 'Yes',
      });
    }
  }
  const due = parseDay(budget.proposalSubmissionDueDate);
  if (due)
    rows.push({ label: 'Proposal due', value: formatDay(due) });

  return rows.slice(0, 10);
};

const firstNameOf = (name: unknown): string | null => {
  if (typeof name !== 'string') return null;
  const first = name.trim().split(/\s+/)[0];
  return first || null;
};

const dayPart = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
};

const money = (
  minor: number | null | undefined,
  currency: string | null,
) => {
  if (minor === null || minor === undefined || !currency) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(minor / 100);
  } catch {
    return `${(minor / 100).toLocaleString()} ${currency}`;
  }
};

/**
 * Headline range figures, rounded to the nearest thousand. A band as wide as
 * "$48,697 – $121,981" claims a precision it does not have; the exact numbers
 * still appear on the individual line items.
 */
const roundedMoney = (
  minor: number | null | undefined,
  currency: string | null,
) => {
  if (minor === null || minor === undefined || !currency) return '—';
  const major = minor / 100;
  if (major < 1000) return money(minor, currency);
  const thousands = Math.round(major / 1000);
  try {
    return `${new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(thousands * 1000)}`;
  } catch {
    return `${(thousands * 1000).toLocaleString()} ${currency}`;
  }
};

const MAX_STAGED_FILES = 3;

const formatFileSize = (bytes: number) => {
  if (bytes >= 1_048_576)
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1_024) return `${Math.round(bytes / 1_024)} KB`;
  return `${bytes} B`;
};

// ── Small presentational pieces ──────────────────────────────────────────────

function SourceChips({
  chips,
}: {
  chips: Array<{ label: string; count: number }>;
}) {
  if (chips.length === 0) return null;
  return (
    <div className="mb-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
        Sources
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <li
            key={chip.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
          >
            <FileText
              size={11}
              className="shrink-0 text-slate-400"
              aria-hidden
            />
            <span
              className="max-w-[12rem] truncate"
              title={chip.label}
            >
              {chip.label}
            </span>
            <span className="rounded-full bg-white px-1.5 text-[10px] font-semibold text-slate-500">
              {chip.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardFooter({
  detailsHref,
  detailsLabel,
}: {
  detailsHref?: string;
  detailsLabel?: string;
}) {
  if (!detailsHref) return null;
  return (
    <div className="mt-3 flex items-center gap-3 border-t border-slate-100 pt-2.5">
      <Link
        href={detailsHref}
        className="text-xs font-semibold text-[#087f69] underline underline-offset-2"
      >
        {detailsLabel ?? 'View details'}
      </Link>
    </div>
  );
}

// ── Shared card action row ───────────────────────────────────────────────────
// Every "what next?" card in the thread offers the same three actions in the
// same order and at the same height: one solid primary (generate/regenerate the
// draft), an outline secondary (readiness check, only while no report is on
// screen) and a quiet tertiary link into the editor. Two cards must never show
// two primary buttons that do the same thing, so the caller decides which card
// owns the row.
const ACTION_BASE =
  'inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:min-h-0 sm:w-auto sm:shrink-0';
const ACTION_PRIMARY = `${ACTION_BASE} bg-[#087f69] text-white hover:bg-[#0a9a81]`;
const ACTION_SECONDARY = `${ACTION_BASE} border border-[#087f69] bg-white text-[#087f69] hover:bg-emerald-50`;
const ACTION_TERTIARY = `${ACTION_BASE} px-1 text-slate-500 underline underline-offset-2 hover:text-slate-800`;

function CardActionRow({
  proposalId,
  hasDraft,
  draftBusy,
  onGenerateDraft,
  onRunReadiness,
  readinessBusy = false,
}: {
  proposalId: string;
  hasDraft: boolean;
  draftBusy: boolean;
  onGenerateDraft: () => void;
  // Omitted when a readiness report is already on screen — the check never
  // competes with a result the user is already reading.
  onRunReadiness?: () => void;
  readinessBusy?: boolean;
}) {
  return (
    <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <button
        type="button"
        onClick={onGenerateDraft}
        disabled={draftBusy}
        aria-busy={draftBusy}
        className={ACTION_PRIMARY}
      >
        {draftBusy && (
          <Loader2 size={12} className="animate-spin" aria-hidden />
        )}
        {draftBusy
          ? 'Generating…'
          : hasDraft
            ? 'Regenerate draft'
            : 'Generate proposal draft'}
      </button>
      {onRunReadiness && (
        <button
          type="button"
          onClick={onRunReadiness}
          disabled={readinessBusy}
          aria-busy={readinessBusy}
          className={ACTION_SECONDARY}
        >
          {readinessBusy && (
            <Loader2 size={12} className="animate-spin" aria-hidden />
          )}
          {readinessBusy ? 'Checking…' : 'Run readiness check'}
        </button>
      )}
      <Link
        href={`/proposals/proposal-edit?proposalId=${proposalId}`}
        className={ACTION_TERTIARY}
      >
        Edit all details
      </Link>
    </div>
  );
}

function SkeletonCard({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <span
          aria-hidden
          className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[#00c2c9] border-t-transparent"
        />
        {label} You can keep working while this finishes.
      </p>
      <div className="mt-3 space-y-2" aria-hidden>
        <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

function DraftProgressCard({ updating }: { updating: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={
        updating
          ? 'Updating your proposal draft'
          : 'Creating your proposal draft'
      }
      data-testid="draft-progress-card"
      className="w-full max-w-3xl overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)]"
    >
      <div className="flex items-start gap-3 bg-gradient-to-r from-emerald-50 via-white to-cyan-50/70 px-4 py-4 sm:px-5">
        <span className="relative mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#087f69] text-white shadow-sm">
          <FileText size={17} aria-hidden />
          <span
            aria-hidden
            className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-[#00c2c9]"
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              {updating
                ? 'Updating your proposal draft…'
                : 'Creating your proposal draft…'}
            </h3>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              <Loader2 size={10} className="animate-spin" aria-hidden />
              In progress
            </span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Using your latest proposal details and answers. You can keep
            working while this finishes.
          </p>
        </div>
      </div>
    </div>
  );
}

function DraftSendFailureCard({
  message,
  hasCurrentDraft,
  onRetry,
}: {
  message: string;
  hasCurrentDraft: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="w-full max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 shadow-sm">
      <p role="alert" className="font-semibold">
        The draft update could not be started.
      </p>
      <p className="mt-1 text-xs leading-relaxed text-red-800">
        {message}
        {hasCurrentDraft ? ' Your current draft is unchanged.' : ''}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex min-h-9 items-center justify-center rounded-lg bg-red-700 px-3 text-xs font-bold text-white transition hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
      >
        Retry draft generation
      </button>
    </div>
  );
}

// ChatGPT-style guided clarification flow: ONE question at a time in the
// thread, with progress, an impact tag, a typed answer control (date picker,
// choice pills, number or free text, chosen by the backend) and a Skip action.
// An invalid answer (backend 422) keeps the question and shows the validation
// message so the user can re-answer.
const ANSWER_FIELD_CLASS =
  'min-h-10 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#00c2c9] focus:ring-2 focus:ring-[#00c2c9]/25 disabled:cursor-not-allowed disabled:bg-slate-50 sm:flex-1';
const PRIMARY_BUTTON_CLASS =
  'min-h-10 w-full rounded-lg bg-[#087f69] px-3.5 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:shrink-0';
const SKIP_BUTTON_CLASS =
  'min-h-10 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] disabled:cursor-not-allowed disabled:opacity-50';

export function isBeforeLocalToday(
  candidate: Date,
  now = new Date(),
): boolean {
  const selectedDay = new Date(candidate);
  selectedDay.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return selectedDay < today;
}

const isEventEndDateQuestion = (question: ConversationQuestion) =>
  question.paths.some((path) => path.endsWith('/event/endDate'));

const isLoadInDateQuestion = (question: ConversationQuestion) =>
  question.paths.some((path) =>
    path.endsWith('/venueSchedule/loadInDate'),
  );

const isLoadInTimeQuestion = (question: ConversationQuestion) =>
  question.paths.some((path) =>
    path.endsWith('/venueSchedule/loadInTime'),
  );

export const displayQuestionPrompt = (
  question: ConversationQuestion,
): string => {
  if (
    question.paths.some((path) =>
      path.endsWith('/venueSchedule/venueName'),
    )
  ) {
    return 'Which venue will host the event? Enter the venue name, or use Skip if it is still undecided.';
  }
  return (
    question.prompt ||
    question.code.replaceAll('_', ' ').toLowerCase()
  );
};

export function minimumDateForQuestion(
  question: ConversationQuestion,
  proposal: Record<string, unknown> | null,
  now = new Date(),
): Date {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  if (!isEventEndDateQuestion(question) || !proposal) return today;

  const event = isRecord(proposal.event) ? proposal.event : {};
  const start = parseDay(event.startDate);
  if (!start) return today;
  const startDate = new Date(start.year, start.month, start.day);
  return startDate > today ? startDate : today;
}

export function maximumDateForQuestion(
  question: ConversationQuestion,
  proposal: Record<string, unknown> | null,
): Date | undefined {
  if (!isLoadInDateQuestion(question) || !proposal) return undefined;
  const venueSchedule = isRecord(proposal.venueSchedule)
    ? proposal.venueSchedule
    : {};
  const event = isRecord(proposal.event) ? proposal.event : {};
  const start =
    parseDay(venueSchedule.showStartDate) ??
    parseDay(event.startDate);
  return start
    ? new Date(start.year, start.month, start.day)
    : undefined;
}

// A yyyy-mm-dd string parsed into local calendar parts, matching how the
// value round-trips through localIsoDay — a plain `new Date(iso)` would
// anchor to UTC midnight and can render a day early for anyone west of UTC.
// Callers only pass a string already validated against /^\d{4}-\d{2}-\d{2}$/.
function parseIsoLocalDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function GuidedQuestionCard({
  question,
  current,
  busy,
  error,
  minimumDate,
  maximumDate,
  initialDate,
  initialTime,
  onAnswer,
  onSkip,
}: {
  question: ConversationQuestion;
  current: number;
  busy: boolean;
  error: string | null;
  minimumDate: Date;
  maximumDate?: Date;
  initialDate?: string;
  initialTime?: string;
  onAnswer: (answer: ConversationQuestionAnswer) => void;
  onSkip: () => void;
}) {
  // The caller keys this card by question id, so the control resets per question.
  const answerType = question.answerType;
  // Extraction-sourced prefill: the control is seeded with what the planner's
  // own message already contained, so confirming is one action. Nothing is
  // written until they answer — the confirmation IS the per-field review.
  const suggested = question.suggestedAnswer ?? null;
  // A stable primitive (not a Date instance): the Date built below would
  // otherwise get a fresh identity every render even when the underlying
  // suggestion is unchanged, which would make an effect keyed on it re-fire
  // every render instead of only when a suggestion actually arrives/changes.
  const suggestedDayIso = (() => {
    const rawDay =
      answerType === 'date_time' ? initialDate : suggested;
    if (
      (answerType !== 'date' && answerType !== 'date_time') ||
      !rawDay
    )
      return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDay)) return null;
    const parsed = parseIsoLocalDate(rawDay);
    // A suggestion outside this question's date bounds is not seeded; the
    // planner picks manually under the same rules as an unassisted answer.
    if (isBeforeLocalToday(parsed, minimumDate)) return null;
    if (maximumDate && parsed > maximumDate) return null;
    return rawDay;
  })();
  const [value, setValue] = useState(() =>
    answerType === 'date_time'
      ? (initialTime ?? '')
      : answerType === 'date' || answerType === 'choice'
        ? ''
        : (suggested ?? ''),
  );
  const [day, setDay] = useState<Date | null>(() =>
    suggestedDayIso ? parseIsoLocalDate(suggestedDayIso) : null,
  );
  const [dateError, setDateError] = useState<string | null>(null);
  const [pendingOption, setPendingOption] = useState<string | null>(
    null,
  );
  // The question keeps the same id for its whole lifetime (it is only
  // superseded once its target field is actually filled), so a suggestion
  // that arrives after mount — extraction finishing while this card is
  // already showing — needs to reach the control without a remount. It is
  // applied only while the planner has not touched the control; touching it
  // once opts this question instance out of further auto-fill. Adjusted
  // during render (React's documented pattern for syncing state off a prop
  // change) rather than in an effect, so the stale value never paints.
  const [edited, setEdited] = useState(false);
  const [prevSuggested, setPrevSuggested] = useState(suggested);
  if (suggested !== prevSuggested) {
    setPrevSuggested(suggested);
    if (
      !edited &&
      answerType !== 'date' &&
      answerType !== 'date_time' &&
      answerType !== 'choice'
    ) {
      setValue(suggested ?? '');
    }
  }
  const [prevSuggestedDayIso, setPrevSuggestedDayIso] =
    useState(suggestedDayIso);
  if (suggestedDayIso !== prevSuggestedDayIso) {
    setPrevSuggestedDayIso(suggestedDayIso);
    if (
      !edited &&
      (answerType === 'date' || answerType === 'date_time')
    ) {
      setDay(
        suggestedDayIso ? parseIsoLocalDate(suggestedDayIso) : null,
      );
    }
  }
  const impactLabel = question.impact
    ? impactLabels[question.impact]
    : null;
  const suggestedOption =
    answerType === 'choice' &&
    suggested &&
    question.options.includes(suggested)
      ? suggested
      : null;
  // The caption only shows while the control still holds the untouched
  // suggestion.
  const prefilled =
    answerType === 'choice'
      ? !!suggestedOption
      : answerType === 'date' || answerType === 'date_time'
        ? !!suggestedDayIso &&
          !!day &&
          localIsoDay(day) === suggestedDayIso
        : !!suggested && value === suggested;
  const isTimeAnswer =
    answerType === 'time' || isLoadInTimeQuestion(question);
  const inputId = `guided-answer-${question.id}`;
  const errorId = `guided-answer-error-${question.id}`;
  const displayError = dateError || error;
  // A picked day is submitted from its LOCAL calendar parts; toISOString would
  // shift the date by a day for anyone west of UTC.
  const answer: ConversationQuestionAnswer | null =
    answerType === 'date'
      ? day
        ? localIsoDay(day)
        : null
      : answerType === 'date_time'
        ? day && value.trim()
          ? { date: localIsoDay(day), time: value.trim() }
          : null
        : value.trim() || null;
  const skipButton = (
    <button
      type="button"
      onClick={() => {
        if (!busy) onSkip();
      }}
      disabled={busy}
      className={`${SKIP_BUTTON_CLASS} ${answerType === 'choice' ? 'w-auto shrink-0' : 'w-full sm:w-auto sm:shrink-0'}`}
    >
      Skip
    </button>
  );

  return (
    <div className="my-2 w-full max-w-3xl rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700">
          Guided question {current}
        </p>
        {impactLabel && (
          <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-amber-800">
            {impactLabel}
          </span>
        )}
        {question.severity === 'blocking' && (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">
            Blocking
          </span>
        )}
      </div>
      <p className="mt-2 text-sm font-medium text-slate-900">
        {displayQuestionPrompt(question)}
      </p>

      {answerType === 'choice' ? (
        // One tap answers: each pill submits its own value, so there is no
        // separate Answer step for a closed set of options. Long lists (e.g.
        // the nine streaming platforms) get tighter pills, and every pill wraps
        // rather than stretching the card on a narrow screen.
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {question.options.map((option) => {
            // Only the in-flight pill is highlighted, so a rejected answer (422)
            // never leaves an option looking accepted. The extraction-suggested
            // pill gets a distinct (non-active) accent so it reads as "found in
            // your message", not "already chosen".
            const active = busy && pendingOption === option;
            const isSuggested = !active && option === suggestedOption;
            return (
              <button
                key={option}
                type="button"
                disabled={busy}
                aria-busy={active}
                {...(isSuggested
                  ? {
                      'aria-description':
                        'Suggested from your message',
                    }
                  : {})}
                onClick={() => {
                  if (busy) return;
                  setPendingOption(option);
                  onAnswer(option);
                }}
                className={`max-w-full whitespace-normal break-words rounded-full border text-left text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 ${
                  question.options.length > 5
                    ? 'px-3 py-1.5'
                    : 'px-4 py-2'
                } ${
                  active
                    ? 'border-[#087f69] bg-[#087f69] text-white'
                    : isSuggested
                      ? 'border-[#00c2c9] bg-[#00c2c9]/10 text-[#087f69] hover:border-[#087f69]'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-[#00c2c9] hover:bg-[#00c2c9]/10 hover:text-[#087f69]'
                }`}
              >
                {active ? 'Saving…' : option}
              </button>
            );
          })}
          {skipButton}
        </div>
      ) : (
        <form
          className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            if (answer !== null && !busy) onAnswer(answer);
          }}
        >
          {answerType === 'date' || answerType === 'date_time' ? (
            <div className="col-span-2 flex w-full items-center sm:min-w-[11rem] sm:flex-1 sm:basis-48">
              <label htmlFor={inputId} className="sr-only">
                Answer this question
              </label>
              <GlobalDateInput
                id={inputId}
                value={day}
                onChange={(nextDay) => {
                  setEdited(true);
                  if (
                    nextDay &&
                    isBeforeLocalToday(nextDay, minimumDate)
                  ) {
                    setDay(null);
                    setDateError(
                      isEventEndDateQuestion(question)
                        ? 'Event end date cannot be earlier than the event start date.'
                        : 'Event start date cannot be earlier than today.',
                    );
                    return;
                  }
                  if (
                    nextDay &&
                    maximumDate &&
                    nextDay > maximumDate
                  ) {
                    setDay(null);
                    setDateError(
                      'Production load-in cannot be after the event start date.',
                    );
                    return;
                  }
                  setDateError(null);
                  setDay(nextDay);
                }}
                format="yyyy-MM-dd"
                placeholder="YYYY-MM-DD"
                minDate={minimumDate}
                maxDate={maximumDate}
                hideLabel
                showErrorMessage={false}
                disabled={busy}
                error={displayError ?? undefined}
                ariaInvalid={!!displayError}
                ariaDescribedBy={displayError ? errorId : undefined}
                inputClassName={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#00c2c9] focus:ring-2 focus:ring-[#00c2c9]/25 ${busy ? 'cursor-not-allowed bg-slate-50' : ''}`}
                buttonClassName="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#087f69]"
              />
            </div>
          ) : null}
          {answerType !== 'date' && (
            <input
              type={
                isTimeAnswer
                  ? 'time'
                  : answerType === 'number'
                    ? 'number'
                    : 'text'
              }
              {...(answerType === 'number'
                ? { min: 0, inputMode: 'numeric' as const, step: 1 }
                : isTimeAnswer
                  ? { step: 300 }
                  : {})}
              value={value}
              onChange={(event) => {
                setEdited(true);
                setValue(event.target.value);
              }}
              onInput={(event) => {
                setEdited(true);
                setValue(event.currentTarget.value);
              }}
              disabled={busy}
              placeholder={
                answerType === 'number'
                  ? 'Enter a number…'
                  : isTimeAnswer || answerType === 'date_time'
                    ? 'HH:MM'
                    : 'Type your answer…'
              }
              aria-label={
                answerType === 'date_time'
                  ? 'Load-in time'
                  : 'Answer this question'
              }
              aria-invalid={displayError ? true : undefined}
              aria-describedby={displayError ? errorId : undefined}
              className={`${ANSWER_FIELD_CLASS} col-span-2 sm:basis-48`}
            />
          )}
          <button
            type="submit"
            disabled={busy || answer === null}
            className={PRIMARY_BUTTON_CLASS}
          >
            {busy ? 'Saving…' : 'Answer'}
          </button>
          {skipButton}
        </form>
      )}
      {prefilled && !displayError && (
        <p role="note" className="mt-2 text-xs text-slate-600">
          {answerType === 'choice'
            ? 'The highlighted option comes from your message — tap it to confirm.'
            : 'Pre-filled from your message — confirm or edit.'}
        </p>
      )}
      {displayError && (
        <p
          id={errorId}
          role="alert"
          className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800"
        >
          {displayError}
        </p>
      )}
    </div>
  );
}

// Details of a completed extraction run: evidence chips grouped per source,
// count of suggested fields linking to the review surface, and the model badge.
function ContextRunCard({
  proposalId,
  message,
  sourcesById,
}: {
  proposalId: string;
  message: ConversationMessage;
  sourcesById: Map<string, PrivateDocumentSource>;
}) {
  const [chips, setChips] = useState<
    Array<{ label: string; count: number }>
  >([]);
  const [fieldCount, setFieldCount] = useState<number | null>(null);

  useEffect(() => {
    if (!message.runId) return;
    let active = true;
    void getProposalContextAction(proposalId, message.runId).then(
      (result) => {
        if (!active || !result.success) return;
        const evidence = Array.isArray(result.data.evidence)
          ? result.data.evidence
          : [];
        const counts = new Map<string, number>();
        for (const row of evidence) {
          const versionId =
            isRecord(row) && typeof row.source_version_id === 'string'
              ? row.source_version_id
              : '';
          const sourceId = versionId.startsWith('source:')
            ? versionId.slice('source:'.length)
            : versionId;
          const label =
            sourcesById.get(sourceId)?.originalFilename ||
            'Attached source';
          counts.set(label, (counts.get(label) ?? 0) + 1);
        }
        setChips(
          [...counts.entries()].map(([label, count]) => ({
            label,
            count,
          })),
        );
        setFieldCount(
          Array.isArray(result.data.operations)
            ? result.data.operations.length
            : 0,
        );
      },
    );
    return () => {
      active = false;
    };
  }, [proposalId, message.runId, sourcesById]);

  const reviewHref = `/proposals/proposal-edit?proposalId=${proposalId}`;
  return (
    <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <SourceChips chips={chips} />
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
        Extracted from your sources
      </p>
      <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-800">
        {message.content}
      </p>
      {fieldCount !== null && (
        <Link
          href={reviewHref}
          className="mt-2 inline-flex min-h-10 w-full flex-wrap items-center justify-center gap-2 rounded-lg border border-[#087f69] px-3 py-1.5 text-center text-xs font-semibold text-[#087f69] transition-colors hover:bg-emerald-50 sm:w-auto"
        >
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900">
            Suggestions
          </span>
          Review &amp; apply {fieldCount} extracted field
          {fieldCount === 1 ? '' : 's'}
        </Link>
      )}
      <CardFooter detailsHref={reviewHref} />
    </div>
  );
}

// The version a draft run was generated against. The run payload is the raw
// database row, so the snake_case column is authoritative; the camelCase name
// is accepted for older/normalised payloads. Anything else stays unknown — the
// staleness hint is never rendered on a guess.
const draftRunVersion = (run: unknown): number | null => {
  if (!isRecord(run)) return null;
  const raw =
    run.expected_proposal_version ?? run.expectedProposalVersion;
  if (typeof raw !== 'number' && typeof raw !== 'string') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
};

function PreviousDraftCard({ message }: { message: ConversationMessage }) {
  return (
    <details className="group w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-left marker:content-none sm:px-5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-600">
          <FileText size={15} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-700">
              Previous proposal draft
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Superseded
            </span>
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            A newer draft is now the current version.
          </span>
        </span>
        <ChevronDown
          size={16}
          className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:px-5">
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </details>
  );
}

// Details of a completed draft run: read-only sections rendered inline, plus a
// quiet staleness hint when the proposal moved on after the draft was written.
function DraftRunCard({
  proposalId,
  message,
  currentProposalVersion,
  draftBusy,
  onRegenerate,
  updated,
}: {
  proposalId: string;
  message: ConversationMessage;
  currentProposalVersion: number | undefined;
  draftBusy: boolean;
  onRegenerate: () => void;
  updated: boolean;
}) {
  const [sections, setSections] = useState<ProposalDraftSection[]>(
    [],
  );
  const [run, setRun] = useState<Record<string, unknown> | null>(
    null,
  );
  const [previewLoading, setPreviewLoading] = useState(Boolean(message.runId));

  useEffect(() => {
    if (!message.runId) return;
    let active = true;
    void getProposalDraftAction(proposalId, message.runId).then((result) => {
      if (!active) return;
      if (result.success) {
        setSections(result.data.sections ?? []);
        setRun(isRecord(result.data.run) ? result.data.run : null);
      }
      setPreviewLoading(false);
    });
    return () => {
      active = false;
    };
  }, [proposalId, message.runId]);

  const draftVersion = draftRunVersion(run);
  // Both versions must be known: a missing version means "unknown", not "stale".
  const stale =
    draftVersion !== null &&
    typeof currentProposalVersion === 'number' &&
    currentProposalVersion > draftVersion;

  const detailsHref = `/proposals/proposal-edit?proposalId=${proposalId}`;
  return (
    <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_30px_-18px_rgba(15,23,42,0.35)]">
      <header className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 via-white to-cyan-50/60 px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#087f69] text-white shadow-sm">
            <FileText size={17} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {updated
                  ? 'Updated proposal draft ready'
                  : 'Proposal draft ready'}
              </h3>
              <span className="rounded-full border border-emerald-200 bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                Current draft
              </span>
              {!previewLoading && sections.length > 0 && (
                <span className="rounded-full border border-emerald-200 bg-white/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  {sections.length} {sections.length === 1 ? 'section' : 'sections'}
                </span>
              )}
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {message.content}
            </p>
          </div>
        </div>
      </header>
      {stale && (
        <div className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 sm:mx-5">
          <p className="flex min-w-0 items-start gap-2 text-xs leading-relaxed text-amber-900">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
            This draft was written before your latest answers.
          </p>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={draftBusy}
            aria-busy={draftBusy}
            className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:min-h-0 sm:w-auto sm:shrink-0"
          >
            {draftBusy && <Loader2 size={12} className="animate-spin" aria-hidden />}
            {draftBusy ? 'Generating…' : 'Regenerate draft'}
          </button>
        </div>
      )}
      <div className="px-4 py-4 sm:px-5">
        {previewLoading ? (
          <div role="status" className="space-y-3" aria-label="Loading draft preview">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <div className="h-2.5 w-28 animate-pulse rounded bg-slate-200" />
                <div className="mt-3 h-2.5 w-full animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-2.5 w-4/5 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
            <span className="sr-only">Loading draft preview</span>
          </div>
        ) : sections.length > 0 ? (
          <article className="space-y-3" aria-label="Proposal draft preview">
            {sections.map((section, sectionIndex) => (
              <section key={section.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_14px_-12px_rgba(15,23,42,0.45)]">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-[#087f69]">
                    {sectionIndex + 1}
                  </span>
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600">
                    {section.heading}
                  </h4>
                </div>
                <div className="mt-3 space-y-3 pl-0 sm:pl-8">
                {section.paragraphs.length > 0 ? (
                  section.paragraphs.map((paragraph, index) => (
                    <div key={index}>
                      <p className="text-sm leading-6 text-slate-700">
                        {paragraph.text}
                      </p>
                      {paragraph.citations.length > 0 && (
                        <div
                          className="mt-2 flex flex-wrap gap-1.5"
                          aria-label="Sources"
                        >
                          {paragraph.citations.map((citation) => (
                            <span
                              key={citation}
                              data-citation={citation}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500"
                            >
                              <Check size={9} className="text-emerald-600" aria-hidden />
                              {citationLabel(citation)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm italic leading-6 text-slate-400">
                    Nothing supported by evidence yet for this
                    section.
                  </p>
                )}
              </div>
              </section>
            ))}
          </article>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center">
            <p className="text-sm font-medium text-slate-700">The draft is ready to review in the editor.</p>
            <p className="mt-1 text-xs text-slate-500">Open it to review and refine the full proposal.</p>
          </div>
        )}
      </div>
      <footer className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
        <Link href={detailsHref} className={ACTION_PRIMARY}>
          <PencilLine size={13} aria-hidden />
          Review &amp; edit draft
        </Link>
      </footer>
    </div>
  );
}

// "Here's what I captured" overview: the key details already on the proposal
// plus the explicit next step (generate the draft). It replaces the old
// no-questions notice and disappears once a draft run exists.
// `showActions` is false when the completion progress card is on screen — that
// card then owns the single primary action for the whole thread.
function OverviewCard({
  proposalId,
  eventName,
  rows,
  detailCount,
  detailSource,
  pendingReview,
  busy,
  error,
  showActions,
  hasDraft,
  onGenerateDraft,
  onRunReadiness,
  readinessBusy,
}: {
  proposalId: string;
  detailSource: 'sources' | 'answers' | 'both';
  eventName: string | null;
  rows: OverviewRow[];
  detailCount: number;
  pendingReview: number;
  busy: boolean;
  error: string | null;
  showActions: boolean;
  hasDraft: boolean;
  onGenerateDraft: () => void;
  onRunReadiness?: () => void;
  readinessBusy: boolean;
}) {
  const editorHref = `/proposals/proposal-edit?proposalId=${proposalId}`;
  const title =
    eventName && eventName !== PLACEHOLDER_EVENT_NAME
      ? eventName
      : 'your proposal';
  return (
    <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold text-slate-900">
          Here&rsquo;s what I have for {title}
        </p>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
          Confirmed in proposal
        </span>
      </div>
      {rows.length > 0 && (
        <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex flex-col items-start gap-0.5 border-b border-slate-100 pb-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
            >
              <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {row.label}
              </dt>
              <dd
                className="min-w-0 max-w-full whitespace-normal break-words text-left text-sm text-slate-800 sm:truncate sm:text-right"
                title={row.value}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {detailCount > 0 && (
        <p className="mt-2.5 text-xs text-slate-500">
          {detailCount} detail{detailCount === 1 ? '' : 's'} captured
          from{' '}
          {detailSource === 'sources'
            ? 'your sources'
            : detailSource === 'answers'
              ? 'your answers'
              : 'your sources and answers'}
          .
        </p>
      )}
      {pendingReview > 0 && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-950">
          <span className="font-bold uppercase tracking-wide text-amber-800">
            Suggestions · not yet confirmed
          </span>
          {' — '}
          Extracted fields still need your explicit review before they
          become proposal values.{' '}
          <Link
            href={editorHref}
            className="font-semibold text-[#087f69] underline underline-offset-2"
          >
            Review suggestions
          </Link>
        </p>
      )}
      {showActions && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <CardActionRow
            proposalId={proposalId}
            hasDraft={hasDraft}
            draftBusy={busy}
            onGenerateDraft={onGenerateDraft}
            onRunReadiness={onRunReadiness}
            readinessBusy={readinessBusy}
          />
          <p className="mt-2 text-xs text-slate-500">
            Or add more details — upload another file, paste notes, or
            ask me anything.
          </p>
        </div>
      )}
      {showActions && error && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// The 3 thinnest sections, so the card names what is actually worth filling in
// next. Complete sections are never listed — this is a progress moment.
export const weakestSections = (
  report: GuidanceReport,
): GuidanceSectionCompleteness[] =>
  [...report.completeness]
    .filter((section) => section.total > 0 && section.score < 1)
    .sort(
      (a, b) => a.score - b.score || a.label.localeCompare(b.label),
    )
    .slice(0, 3);

// Shown once every key question is answered: a real progress summary from the
// deterministic guidance engine (percentage, slim bar, weakest sections) rather
// than a vague "everything else is optional". A failed check degrades to the
// plain headline — the actions always stay available.
function CompletionCard({
  proposalId,
  report,
  checking,
  hasDraft,
  draftBusy,
  draftError,
  onGenerateDraft,
  onRunReadiness,
  readinessBusy,
}: {
  proposalId: string;
  report: GuidanceReport | null;
  checking: boolean;
  hasDraft: boolean;
  draftBusy: boolean;
  draftError: string | null;
  onGenerateDraft: () => void;
  onRunReadiness?: () => void;
  readinessBusy: boolean;
}) {
  const percent = report
    ? Math.round(report.overallCompleteness * 100)
    : null;
  const weakest = report ? weakestSections(report) : [];
  return (
    <div className="w-full max-w-3xl rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
      <p className="text-sm font-semibold text-emerald-900">
        {/* Not "X% complete": the stepper uses "complete" for how far
            through the workflow a proposal is, and this measures how much of
            the questionnaire is filled in. Two different questions deserve two
            different words, or a planner reads them as contradicting. */}
        {percent === null
          ? 'Key questions answered.'
          : `Your proposal details are ${percent}% filled in`}
      </p>
      {percent !== null && (
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Proposal completeness"
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100"
        >
          <div
            className="h-full rounded-full bg-[#087f69]"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      {percent === null && checking && (
        <p role="status" className="mt-1 text-xs text-emerald-800">
          Checking what&rsquo;s left…
        </p>
      )}
      {weakest.length > 0 && (
        <ul className="mt-3 space-y-1">
          {weakest.map((section) => (
            <li
              key={section.section || section.label}
              className="flex items-baseline justify-between gap-3 rounded-lg border border-emerald-100 bg-white px-2.5 py-1.5 text-xs text-slate-700"
            >
              <span
                className="min-w-0 truncate"
                title={section.label}
              >
                {section.label}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-slate-500">
                {section.filled}/{section.total}
              </span>
            </li>
          ))}
        </ul>
      )}
      {report && report.blockingCount > 0 && (
        <p className="mt-2 text-xs font-medium text-amber-800">
          {report.blockingCount} item
          {report.blockingCount === 1 ? '' : 's'} need
          {report.blockingCount === 1 ? 's' : ''} attention before
          publishing.
        </p>
      )}
      <CardActionRow
        proposalId={proposalId}
        hasDraft={hasDraft}
        draftBusy={draftBusy}
        onGenerateDraft={onGenerateDraft}
        onRunReadiness={onRunReadiness}
        readinessBusy={readinessBusy}
      />
      {draftError && (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800"
        >
          {draftError}
        </p>
      )}
    </div>
  );
}

function GuidanceCard({ report }: { report: GuidanceReport }) {
  const visibleFindings = report.findings.filter(
    (finding) => !isRetiredStandaloneRecordingFinding(finding),
  );
  const blocking = visibleFindings.filter(
    (f) => f.severity === 'blocking',
  ).length;
  const warnings = visibleFindings.filter(
    (f) => f.severity === 'warning',
  ).length;
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:max-w-[85%]">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
        Results — Readiness check
      </p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">
          Overall completeness
        </p>
        <p className="text-xl font-bold text-slate-900">
          {Math.round(report.overallCompleteness * 100)}%
        </p>
      </div>
      <div
        aria-hidden
        className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-[#087f69]"
          style={{
            width: `${Math.round(report.overallCompleteness * 100)}%`,
          }}
        />
      </div>
      <p className="mt-2 text-sm text-slate-700">
        {visibleFindings.length === 0
          ? 'No issues found. Your proposal fields look consistent.'
          : `${visibleFindings.length} finding${visibleFindings.length === 1 ? '' : 's'} — ${blocking} blocking, ${warnings} worth reviewing.`}
      </p>
      {visibleFindings.slice(0, 3).map((finding) => (
        <p
          key={`${finding.code}-${finding.paths.join(',')}`}
          className="mt-1.5 rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs text-slate-700"
        >
          {finding.message}
        </p>
      ))}
      <p className="mt-2 text-[11px] text-slate-400">
        Verified checks based on your proposal details.
      </p>
    </div>
  );
}

function InvestmentCard({
  report,
  declaredBudget,
}: {
  report: InvestmentReport;
  declaredBudget: string;
}) {
  const summary =
    report.totalMidMinor !== null && report.currency
      ? `Estimated investment ${roundedMoney(report.totalLowMinor, report.currency)} – ${roundedMoney(report.totalHighMinor, report.currency)} (mid ${roundedMoney(report.totalMidMinor, report.currency)}).`
      : 'Investment guidance generated — some categories need more information before an estimate is possible.';
  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:max-w-[85%]">
      <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
        Results — Investment guidance
      </p>
      <p className="mt-2 text-sm text-slate-800">{summary}</p>
      {declaredBudget && (
        <p className="mt-2 rounded-lg border border-cyan-100 bg-cyan-50 p-2 text-xs text-slate-700">
          Your stated planning budget is{' '}
          <strong>{declaredBudget}</strong>. The estimate below is
          scope-based guidance, not a replacement for that budget.
        </p>
      )}
      {report.lineItems.length > 0 && (
        <ul className="mt-2 space-y-1">
          {report.lineItems.slice(0, 5).map((item) => (
            <li
              key={item.label}
              className="flex flex-col items-start gap-1 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <span className="truncate">{item.label}</span>
              <span className="font-semibold sm:shrink-0">
                {money(
                  item.midMinor,
                  item.currency || report.currency,
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {report.refusals.length > 0 && (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          {report.refusals.length} categor
          {report.refusals.length === 1 ? 'y' : 'ies'} need more
          information: {report.refusals.map((r) => r.ask).join(' ')}
        </p>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        Range guidance from approved pricing records.
      </p>
    </div>
  );
}

function AssistantTurnAvatar({ busy }: { busy?: boolean }) {
  return (
    <div
      aria-hidden
      className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#087f69]/15 bg-gradient-to-br from-[#087f69]/10 to-[#00c2c9]/10 text-[#087f69] ${busy ? 'motion-safe:animate-pulse' : ''}`}
    >
      <Sparkles size={15} strokeWidth={2} />
    </div>
  );
}

function wrapAssistantTurn(
  content: ReactNode,
  key: string,
  busy?: boolean,
) {
  return (
    <li key={key} className="flex items-start gap-2.5 sm:gap-3">
      <AssistantTurnAvatar busy={busy} />
      <div className="min-w-0 flex-1">{content}</div>
    </li>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AssistantWorkspacePage({
  initialProposalId,
  autoTask,
  voiceInputEnabled = true,
}: {
  initialProposalId?: string;
  /** Task to start on arrival, e.g. from the workflow shell's
      "Create my first draft" deep link (?task=generate_draft). */
  autoTask?: 'generate_draft';
  /** Allows a parent surface to hide voice input when needed. */
  voiceInputEnabled?: boolean;
}) {
  const [proposalId, setProposalId] = useState<string | null>(
    initialProposalId ?? null,
  );
  const [firstName, setFirstName] = useState<string | null>(null);
  const [eventName, setEventName] = useState<string | null>(null);
  // The full proposal document backs the captured-details overview; the
  // breadcrumb reads its event name from the same fetch.
  const [proposal, setProposal] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [text, setText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  // Guided clarification flow: progress across this session plus the latest
  // confirmed value ("Rooms: 6") shown after a successful answer.
  const [answeredCount, setAnsweredCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [lastConfirmed, setLastConfirmed] = useState<{
    label: string;
    value: string;
  } | null>(null);
  const [bulkAnswerProgress, setBulkAnswerProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  // ChatGPT-style staged attachments: picking a file only adds a chip to the
  // composer; the actual upload happens when the message is sent.
  const [staged, setStaged] = useState<File[]>([]);
  const [sendBusy, setSendBusy] = useState(false);
  const [sendLocked, setSendLocked] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [inputClarification, setInputClarification] = useState<string | null>(null);
  // Files already uploaded during a failed send attempt keep their source id so
  // a retry does not upload them a second time.
  const uploadedRef = useRef(new Map<File, string>());
  const [notesOpen, setNotesOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [notesText, setNotesText] = useState('');
  // Rail source removal: which row is asking for confirmation, which one has a
  // delete in flight, and per-row failure messages.
  const [confirmRemoveId, setConfirmRemoveId] = useState<
    string | null
  >(null);
  const [removingSourceId, setRemovingSourceId] = useState<
    string | null
  >(null);
  const [removeErrors, setRemoveErrors] = useState<
    Record<string, string>
  >({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [localCards, setLocalCards] = useState<LocalCard[]>([]);
  const [guidanceBusy, setGuidanceBusy] = useState(false);
  const [segmentBusy, setSegmentBusy] = useState(false);
  const [investmentBusy, setInvestmentBusy] = useState(false);
  const [proposalVersion, setProposalVersion] = useState<number>();
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  // Holds the latest run ordinal at click time until the new persisted draft
  // activity appears. The POST can finish before the conversation replica
  // exposes its pending run; without this bridge the progress card flashes
  // away and the old draft returns for a polling interval.
  const [draftRequestBaseline, setDraftRequestBaseline] = useState<
    number | null
  >(null);
  const [retryingExtractionId, setRetryingExtractionId] = useState<
    string | null
  >(null);
  const [continuedAfterExtractionFailure, setContinuedAfterExtractionFailure] =
    useState<string[]>([]);
  // Completion progress summary: one deterministic guidance run per
  // proposal+version, kept out of render by a ref guard.
  const [completionReport, setCompletionReport] =
    useState<GuidanceReport | null>(null);
  const [completionChecking, setCompletionChecking] = useState(false);
  const completionRunRef = useRef<{
    proposalId: string;
    version: number | null;
  } | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  // React state does not disable the control until the next render. This lock
  // closes that small gap so a double-click or Enter+click combination cannot
  // start two sends in the same turn.
  const sendLockRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceDraftRef = useRef('');
  const voiceResultSegmentsRef = useRef<
    Array<SpeechTranscriptSegment | undefined>
  >([]);
  // SpeechRecognition can emit its final result immediately before `onend`.
  // React may not have committed that last setText yet, so auto-submit reads
  // this synchronous ref instead of a stale render closure.
  const voiceLatestTextRef = useRef('');
  const voiceFinishingRef = useRef(false);
  const transcriptionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const workspaceActionRefs = useRef<Record<
    Exclude<ProposalWorkspaceAction, 'edit_details' | 'download_sample' | 'open_room_specifications' | 'show_actions'>,
    () => Promise<void>
  >>({
    generate_draft: async () => undefined,
    readiness: async () => undefined,
    investment: async () => undefined,
    use_messages: async () => undefined,
    extract_requirements: async () => undefined,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const creatingRef = useRef(false);

  // A general-assistant handoff may carry the user's last question in
  // sessionStorage. It is consumed once and remains an unsent composer draft;
  // opening this workspace never submits it automatically.
  useEffect(() => {
    if (!initialProposalId) return;
    const handoffDraft = takeProposalHandoffDraft(initialProposalId);
    if (handoffDraft) {
      setText((current) => current || handoffDraft);
    }
  }, [initialProposalId]);

  // Grow for both explicit newlines and browser-wrapped lines. Counting
  // newlines alone leaves long single-line messages hidden inside a one-row
  // textarea.
  useEffect(() => {
    const textarea = composerRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > 160 ? 'auto' : 'hidden';
  }, [text]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      if (transcriptionTimerRef.current)
        clearTimeout(transcriptionTimerRef.current);
    },
    [],
  );

  const focusComposerAtEnd = () => {
    requestAnimationFrame(() => {
      const composer = composerRef.current;
      if (!composer) return;
      composer.focus();
      const end = composer.value.length;
      composer.setSelectionRange(end, end);
      composer.scrollTop = composer.scrollHeight;
    });
  };

  const startVoiceInput = (draftOverride?: string) => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setVoiceError(
        'Voice input is not supported by this browser. Try the latest Chrome or Edge.',
      );
      return;
    }

    setVoiceError(null);
    setIsTranscribing(false);
    voiceFinishingRef.current = false;
    voiceDraftRef.current = draftOverride ?? text.trimEnd();
    voiceLatestTextRef.current = voiceDraftRef.current;
    voiceResultSegmentsRef.current = [];
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const startIndex = Math.max(
        0,
        Math.min(event.resultIndex ?? 0, event.results.length),
      );
      const segments = voiceResultSegmentsRef.current.slice(
        0,
        event.results.length,
      );
      for (let index = startIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        segments[index] = {
          transcript: result[0]?.transcript ?? '',
          isFinal: result.isFinal === true,
        };
      }
      voiceResultSegmentsRef.current = segments;
      const transcript = speechTranscriptFromSegments(segments);
      const prefix = voiceDraftRef.current;
      const latest = [prefix, transcript].filter(Boolean).join(' ');
      voiceLatestTextRef.current = latest;
      setText(latest);
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      setIsTranscribing(false);
      voiceFinishingRef.current = false;
      if (event.error === 'aborted') return;
      setVoiceError(
        event.error === 'not-allowed' || event.error === 'service-not-allowed'
          ? 'Microphone access was blocked. Allow microphone access and try again.'
          : event.error === 'no-speech'
            ? 'No speech was detected. Try again and speak closer to your microphone.'
            : 'Voice input stopped unexpectedly. Please try again.',
      );
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (voiceFinishingRef.current) {
        voiceFinishingRef.current = false;
        transcriptionTimerRef.current = setTimeout(() => {
          setIsTranscribing(false);
          transcriptionTimerRef.current = null;
          focusComposerAtEnd();
        }, 350);
      } else {
        focusComposerAtEnd();
      }
    };
    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setVoiceError('Voice input could not start. Please try again.');
    }
  };

  const finishVoiceInput = () => {
    voiceFinishingRef.current = true;
    setIsTranscribing(true);
    recognitionRef.current?.stop();
  };

  const cancelVoiceInput = () => {
    const original = voiceDraftRef.current;
    voiceFinishingRef.current = false;
    setIsTranscribing(false);
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsListening(false);
    voiceResultSegmentsRef.current = [];
    voiceLatestTextRef.current = original;
    setText(original);
    focusComposerAtEnd();
  };

  const continueVoiceAfterClarification = (message: string) => {
    setInputClarification(message);
    setText('');
    // Clarification stays visual; the assistant never speaks back. Reopen the
    // microphone so the planner can immediately correct the active field.
    requestAnimationFrame(() => startVoiceInput(''));
  };

  const {
    data,
    loading,
    loadError,
    pending,
    sendMessage,
    retrySend,
    resolveQuestion,
    refresh: refreshConversation,
    questionBusyId,
    questionError,
  } = useConversation(proposalId);
  const { notesJob, notesJobId, notesError, notesBusy, submitNotes } =
    useNotesScan(proposalId);
  const { uploadJob, uploadJobId, uploadError, upload } =
    useSourceUpload(proposalId);
  // Auto-orchestration: a send with attachments queues a watch on the new
  // sources' scans; when all of them are ready one extract_requirements message
  // is sent automatically (exactly once per originating send).
  const {
    queueAutoExtract,
    dropSource,
    autoScanning,
    scanCount,
    failedNotices,
  } = useAutoExtraction(proposalId, sendMessage);
  const { sources, refresh: refreshSources } = useProposalSources(
    proposalId,
    `${notesJobId ?? ''}:${uploadJobId ?? ''}:${notesJob?.status ?? ''}:${uploadJob?.status ?? ''}:${autoScanning}`,
  );

  const messages = useMemo(() => data?.messages ?? [], [data]);
  const displayedMessages = useMemo(
    () => visibleRunMessages(messages),
    [messages],
  );
  const draftRunMessages = useMemo(
    () =>
      displayedMessages.filter(
        (message) => message.runType === 'proposal_draft',
      ),
    [displayedMessages],
  );
  const latestDraftActivity = useMemo(
    () =>
      draftRunMessages.reduce<ConversationMessage | null>(
        (latest, message) =>
          !latest || message.ordinal > latest.ordinal ? message : latest,
        null,
      ),
    [draftRunMessages],
  );
  const completedDraftMessages = useMemo(
    () =>
      draftRunMessages.filter((message) => message.status === 'complete'),
    [draftRunMessages],
  );
  const latestCompleteDraft = useMemo(
    () =>
      completedDraftMessages.reduce<ConversationMessage | null>(
        (latest, message) =>
          !latest || message.ordinal > latest.ordinal ? message : latest,
        null,
      ),
    [completedDraftMessages],
  );
  const draftSendPending = pending.some(
    (entry) =>
      entry.intent === 'generate_draft' && entry.state === 'sending',
  );
  const draftSendFailure = pending.find(
    (entry) =>
      entry.intent === 'generate_draft' && entry.state === 'failed',
  );
  const awaitingPersistedDraftActivity =
    draftRequestBaseline !== null &&
    (latestDraftActivity?.ordinal ?? -1) <= draftRequestBaseline;
  const draftInProgress =
    draftSendPending ||
    awaitingPersistedDraftActivity ||
    latestDraftActivity?.status === 'pending';
  // The current draft is an artifact, not a transient chat reply. Anchor it at
  // the bottom of the active workflow so generation begins and completes in
  // the same visible place. Older drafts stay in history as compact summaries.
  const threadMessages = useMemo(
    () =>
      displayedMessages.filter((message) => {
        if (
          message.role === 'user' &&
          message.intent === 'generate_draft'
        )
          return false;
        if (message.id === latestCompleteDraft?.id) return false;
        if (message.id === latestDraftActivity?.id) return false;
        return true;
      }),
    [displayedMessages, latestCompleteDraft?.id, latestDraftActivity?.id],
  );
  const latestContextRun = useMemo(
    () =>
      messages.reduce<ConversationMessage | null>(
        (latest, message) =>
          message.runType === 'proposal_context' &&
          (!latest || message.ordinal > latest.ordinal)
            ? message
            : latest,
        null,
      ),
    [messages],
  );
  const extractionFailureBlocksQuestions =
    latestContextRun?.status === 'failed' &&
    !continuedAfterExtractionFailure.includes(latestContextRun.id);
  const chatExtractionEnabled =
    data?.capabilities?.conversationExtraction === true;
  const activeQuestions = useMemo(
    () =>
      (data?.questions ?? []).filter(
        (question) =>
          STANDALONE_VIDEO_RECORDING_STEP_ENABLED ||
          !question.paths.some(isStandaloneVideoRecordingPath),
      ),
    [data?.questions],
  );
  const openQuestions = activeQuestions.filter(
    (item) => item.status === 'open',
  );
  const currentQuestion = openQuestions[0] ?? null;
  const sourceExtractionInProgress =
    autoScanning ||
    pending.some(
      (item) =>
        item.intent === 'extract_requirements' &&
        item.state === 'sending',
    ) ||
    messages.some(
      (message) =>
        message.runType === 'proposal_context' &&
        message.status === 'pending',
    );
  // answer message id -> the question it answered, so the thread can replay the
  // question above the answer instead of showing a bare value.
  const askedByAnswerMessageId = useMemo(
    () =>
      new Map(
        activeQuestions.flatMap((item) =>
          item.answeredMessageId
            ? [[item.answeredMessageId, item] as const]
            : [],
        ),
      ),
    [activeQuestions],
  );
  const readySources = sources.filter(
    (item) =>
      item.status === 'ready' &&
      item.confidentiality === 'non_confidential',
  );
  const sourcesById = useMemo(
    () => new Map(sources.map((source) => [source.id, source])),
    [sources],
  );
  const sending = pending.some((item) => item.state === 'sending');
  const nonDraftSending = pending.some(
    (item) =>
      item.state === 'sending' && item.intent !== 'generate_draft',
  );
  const assistantResponding = messages.some(
    (message) =>
      message.role === 'assistant' &&
      !message.runType &&
      message.status === 'pending',
  );
  const chatBusy = sending || assistantResponding;
  // A refresh can land the persisted message before the optimistic entry is
  // retired, briefly showing the planner their own message twice. Hide an
  // in-flight entry once its text is already in the thread; a failed entry
  // always stays, because it carries the retry.
  const unsentPending = useMemo(() => {
    const sentContent = new Set(
      messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content.trim()),
    );
    return pending.filter(
      (entry) =>
        entry.intent !== 'generate_draft' &&
        (entry.state === 'failed' ||
          !sentContent.has(entry.content.trim())),
    );
  }, [pending, messages]);
  const started =
    !!proposalId ||
    messages.length > 0 ||
    pending.length > 0 ||
    localCards.length > 0;
  const completedContextRuns = messages.filter(
    (m) =>
      m.runType === 'proposal_context' && m.status === 'complete',
  ).length;

  // Captured-details overview: shown once an extraction has completed, no open
  // clarification question is waiting (the guided flow always goes first).
  // Extracted candidates remain read-only until the user reviews them in the
  // editor; this workspace never saves review decisions or applies fields.
  const hasDraftRun = messages.some(
    (message) =>
      message.runType === 'proposal_draft' &&
      message.status === 'complete',
  );
  const overviewRows = useMemo(
    () => buildOverviewRows(proposal),
    [proposal],
  );
  // A proposal built by conversation alone never has an extraction run, so the
  // hand-off also opens once questions have been answered or the proposal has
  // real content — otherwise that path dead-ends with no way to reach a draft.
  const answeredQuestions = activeQuestions.filter(
    (question) => question.status === 'answered',
  ).length;
  const hasCapturedContent =
    completedContextRuns > 0 ||
    answeredQuestions > 0 ||
    overviewRows.length > 0;
  const showOverview =
    hasCapturedContent &&
    !loading &&
    !!data &&
    openQuestions.length === 0 &&
    !hasDraftRun;
  const overviewDetailCount = overviewRows.length;
  const overviewPendingReview = completedContextRuns > 0 ? 1 : 0;
  // Details reach a proposal by extraction, by answered questions, or both.
  const overviewDetailSource: 'sources' | 'answers' | 'both' =
    completedContextRuns > 0 && answeredQuestions > 0
      ? 'both'
      : completedContextRuns > 0
        ? 'sources'
        : 'answers';

  // Keep the rail mounted as soon as a proposal exists. During the first send,
  // `pending` can clear one render before the persisted assistant message is
  // fetched. Deriving visibility from transient message state made the rail
  // disappear for that frame, expand the thread to full width, then snap back.
  // `started` includes the stable proposal id, so onboarding stays two-column
  // from the first appearance onward.
  const railVisible = started;

  // Greeting name comes from the backend profile via the existing user action.
  useEffect(() => {
    let active = true;
    void getUserData().then((result) => {
      if (!active || !result.ok || !isRecord(result.data)) return;
      const name = firstNameOf(result.data.name);
      if (name) setFirstName(name);
    });
    return () => {
      active = false;
    };
  }, []);

  // One proposal read backs the breadcrumb, captured-details overview, and
  // draft version. Previously two effects fetched the same document whenever
  // the conversation timestamp changed, doubling traffic during polling.
  useEffect(() => {
    // Wait for the initial conversation read so the mount and that first
    // payload do not trigger two back-to-back proposal requests.
    if (!proposalId || loading) return;
    let active = true;
    void (async () => {
      const current = await getProposalByIdAction(proposalId);
      if (!active) return;
      if (current.success && isRecord(current.data)) {
        setProposal(current.data);
        const event = isRecord(current.data.event)
          ? current.data.event
          : null;
        const name =
          typeof event?.eventName === 'string'
            ? event.eventName.trim()
            : '';
        if (name) setEventName(name);
        // The proposal document is authoritative for new and conversation-only
        // proposals, which may never have an extraction review.
        if (typeof current.data.version === 'number') {
          setProposalVersion(current.data.version);
          return;
        }
      }

      // Older proposal payloads may not expose a version. Preserve the existing
      // read-only extraction-review fallback without issuing a second proposal
      // request.
      const latest = await getLatestProposalContextAction(proposalId);
      if (
        !active ||
        !latest.success ||
        !isRecord(latest.data.run) ||
        typeof latest.data.run.id !== 'string'
      )
        return;
      const review = await getCandidateReviewAction(
        proposalId,
        latest.data.run.id,
      );
      if (active && review.success)
        setProposalVersion(review.data.proposalVersion);
    })();
    return () => {
      active = false;
    };
  }, [
    proposalId,
    loading,
    completedContextRuns,
    data?.conversation?.updatedAt,
  ]);

  // Draft generation revalidates the version at click time when the background
  // refresh has not produced one yet. This is intentionally on-demand; the
  // polling effect above still performs only one proposal read per update.
  const fetchProposalVersion = useCallback(
    async (id: string): Promise<number | undefined> => {
      const current = await getProposalByIdAction(id);
      if (
        current.success &&
        isRecord(current.data) &&
        typeof current.data.version === 'number'
      )
        return current.data.version;
      const latest = await getLatestProposalContextAction(id);
      if (
        !latest.success ||
        !isRecord(latest.data.run) ||
        typeof latest.data.run.id !== 'string'
      )
        return undefined;
      const review = await getCandidateReviewAction(
        id,
        latest.data.run.id,
      );
      return review.success ? review.data.proposalVersion : undefined;
    },
    [],
  );

  useEffect(() => {
    threadEndRef.current?.scrollIntoView?.({ block: 'end' });
  }, [
    messages.length,
    pending.length,
    localCards.length,
    autoScanning,
    failedNotices.length,
    openQuestions.length,
    lastConfirmed,
    showOverview,
    draftInProgress,
    latestDraftActivity?.status,
    latestCompleteDraft?.id,
  ]);

  // Lazy creation: the proposal only exists once the user contributes content.
  const ensureProposal = useCallback(async (): Promise<
    string | null
  > => {
    if (proposalId) return proposalId;
    if (creatingRef.current) return null;
    creatingRef.current = true;
    setCreateError(null);
    const result = await createProposalAction({
      event: { eventName: 'Untitled proposal' },
      status: 'unsubmitted',
      isDraft: true,
    } as unknown as ProposalData & { status?: 'unsubmitted' });
    creatingRef.current = false;
    const id =
      isRecord(result.data) && typeof result.data._id === 'string'
        ? result.data._id
        : null;
    if (!result.success || !id) {
      setCreateError(
        result.message ||
          'The proposal could not be created. Please try again.',
      );
      return null;
    }
    setProposalId(id);
    // Stay in place; only move the URL to the proposal's canonical assistant
    // route so resume/share links land on one surface. This must be a shallow
    // history swap, not router.replace(): a router navigation started here
    // races the message send dispatched right after it, and when the
    // navigation wins Next aborts the in-flight server action POST — the send
    // never reaches the backend and the composer hangs on "Sending…" forever.
    window.history.replaceState(
      null,
      '',
      `/proposals/${id}/assistant`,
    );
    return id;
  }, [proposalId]);

  const performSend = async (textOverride?: string, source?: 'voice') => {
    const value = (textOverride ?? text).trim();
    if (chatBusy || sendBusy) return;
    if (!value && staged.length === 0) return;
    setSendError(null);
    setInputClarification(null);
    const id = await ensureProposal();
    if (!id) return;
    const workspaceAction =
      value && staged.length === 0
        ? proposalWorkspaceActionFromInstruction(value)
        : null;
    if (workspaceAction) {
      setText('');
      if (workspaceAction === 'show_actions') {
        setInputClarification(
          'You can say: “Generate draft”, “Edit all details”, “Run readiness check”, “Show investment guidance”, “Download sample sheet”, “Open room specifications”, “Use what I’ve told you”, or “Extract requirements”.',
        );
      } else if (workspaceAction === 'edit_details') {
        window.location.assign(
          `/proposals/proposal-edit?proposalId=${encodeURIComponent(id)}`,
        );
      } else if (workspaceAction === 'open_room_specifications') {
        window.location.assign(
          `/proposals/proposal-edit?proposalId=${encodeURIComponent(id)}&step=3`,
        );
      } else if (workspaceAction === 'download_sample') {
        const link = document.createElement('a');
        link.href = '/files/RFPilot%20schedule-example-sheet.xlsx';
        link.download = 'RFPilot schedule-example-sheet.xlsx';
        link.click();
      } else {
        await workspaceActionRefs.current[workspaceAction]();
      }
      return;
    }
    if (
      value &&
      staged.length === 0 &&
      currentQuestion &&
      !sourceExtractionInProgress
    ) {
      if (FIELD_HELP_COMMAND.test(value)) {
        setText('');
        setInputClarification(questionAnswerHint(currentQuestion));
        return;
      }
      if (isSkipQuestionInstruction(value)) {
        setText('');
        const skipped = await resolveQuestion(currentQuestion.id, {
          status: 'dismissed',
        });
        if (skipped) {
          setSkippedCount((count) => count + 1);
          setLastConfirmed({
            label: questionFieldLabel(currentQuestion),
            value: 'Skipped',
          });
        } else if (source === 'voice') {
          continueVoiceAfterClarification(
            `I couldn't skip ${questionFieldLabel(currentQuestion)}. Please try again.`,
          );
        } else setText(value);
        return;
      }
      const bundledAnswers = mentionedFieldAnswers(openQuestions, value);
      if (bundledAnswers.length > 1) {
        setText('');
        setBulkAnswerProgress({ current: 0, total: bundledAnswers.length });
        let applied = 0;
        let latest = bundledAnswers[0];
        for (const item of bundledAnswers) {
          const resolved = await resolveQuestion(item.question.id, {
            status: 'answered',
            answer: item.answer,
          }, { refresh: false });
          if (!resolved) {
            await refreshConversation();
            setBulkAnswerProgress(null);
            setText(value);
            return;
          }
          applied += 1;
          latest = item;
          setBulkAnswerProgress({ current: applied, total: bundledAnswers.length });
        }
        await refreshConversation();
        setBulkAnswerProgress(null);
        setAnsweredCount((count) => count + applied);
        setLastConfirmed({
          label: `${applied} details`,
          value: `last: ${questionFieldLabel(latest.question)} = ${
            typeof latest.answer === 'string'
              ? latest.answer
              : `${latest.answer.date} at ${latest.answer.time}`
          }`,
        });
        return;
      }
      const isFillCommand = FIELD_COMMAND.test(value);
      const directAnswer = fieldAnswerFromInstruction(currentQuestion, value);
      const currentPathName = currentQuestion.paths.at(-1)?.split('/').at(-1) ?? '';
      const expectsDate =
        currentQuestion.answerType === 'date' ||
        currentQuestion.answerType === 'date_time' ||
        /Date$/i.test(currentPathName);
      if (expectsDate && !directAnswer && looksLikeDateInstruction(value)) {
        // A clipped/invalid date must never fall through to chat or silently
        // confirm an extracted suggestion. Keep the words editable and ask for
        // the one missing fact in plain language.
        const clarification = currentQuestion.answerType === 'date_time'
          ? 'I heard part of the load-in date and time, but it was not complete or unambiguous. Please say it again, for example: Load-in is 20 August 2026 at 3 PM.'
          : 'I heard part of the date, but not a complete valid date. Please say it again, for example: 21 August 2026.';
        if (source === 'voice') continueVoiceAfterClarification(clarification);
        else {
          setText(value);
          setInputClarification(clarification);
        }
        return;
      }
      const conciseReply = value.split(/\s+/).length <= 8 && !value.includes('?');
      if (!directAnswer && conciseReply && currentQuestion.answerType === 'choice') {
        const clarification = `I couldn't match that confidently. Please say one of: ${currentQuestion.options.join(', ')}.`;
        if (source === 'voice') continueVoiceAfterClarification(clarification);
        else {
          setText(value);
          setInputClarification(clarification);
        }
        return;
      }
      if (!directAnswer && conciseReply && currentQuestion.answerType === 'number') {
        const clarification = `I couldn't hear a clear number for ${questionFieldLabel(currentQuestion)}. Please say the number again, for example: 300.`;
        if (source === 'voice') continueVoiceAfterClarification(clarification);
        else {
          setText(value);
          setInputClarification(clarification);
        }
        return;
      }
      const earlierAnswer = isFillCommand
        ? [...messages]
            .reverse()
            .filter((message) => message.role === 'user')
            .map((message) =>
              fieldAnswerFromInstruction(currentQuestion, message.content),
            )
            .find((answer): answer is ConversationQuestionAnswer => answer !== null) ?? null
        : null;
      // A source-derived suggestion wins for a generic "fill this field"
      // command. The planner must state a different value explicitly to
      // replace what document extraction detected.
      const answer =
        directAnswer ??
        (isFillCommand ? currentQuestion.suggestedAnswer : null) ??
        earlierAnswer;
      if (answer) {
        setText('');
        const resolved = await resolveQuestion(currentQuestion.id, {
          status: 'answered',
          answer,
        });
        if (resolved) {
          setAnsweredCount((count) => count + 1);
          setLastConfirmed({
            label: questionFieldLabel(currentQuestion),
            value:
              typeof answer === 'string'
                ? answer
                : `${answer.date} at ${answer.time}`,
          });
        } else {
          if (source === 'voice') {
            continueVoiceAfterClarification(
              `That value wasn't accepted for ${questionFieldLabel(currentQuestion)}. Please say it again.`,
            );
          } else setText(value);
        }
        return;
      }
    }
    // Upload every staged file first (sequentially): upload session -> PUT ->
    // complete -> scan job, all as non_confidential. On any failure the chips
    // stay staged and an inline error offers a retry of the whole send; files
    // that already uploaded are not uploaded again.
    const sourceIds: string[] = [];
    if (staged.length > 0) {
      setSendBusy(true);
      for (const file of staged) {
        let sourceId = uploadedRef.current.get(file) ?? null;
        if (!sourceId)
          sourceId = await upload(file, 'non_confidential', id);
        if (!sourceId) {
          setSendBusy(false);
          setSendError(`${file.name} could not be uploaded.`);
          return;
        }
        uploadedRef.current.set(file, sourceId);
        sourceIds.push(sourceId);
      }
      setSendBusy(false);
    }
    const content = value || 'Please review the attached file.';
    setText('');
    setStaged([]);
    uploadedRef.current.clear();
    const sent = await sendMessage(
      {
        content,
        intent: 'chat',
        ...(sourceIds.length > 0 ? { sourceIds } : {}),
      },
      id,
    );
    // Attachments enter the governed source boundary and start extraction once
    // scanning succeeds. Ordinary chat remains conversation context; users can
    // explicitly promote longer text through the "Add notes" source control.
    if (sent && sourceIds.length > 0) queueAutoExtract(id, sourceIds);
  };

  const handleSend = async (textOverride?: string, source?: 'voice') => {
    if (sendLockRef.current) return;
    sendLockRef.current = true;
    setSendLocked(true);
    try {
      await performSend(textOverride, source);
    } finally {
      sendLockRef.current = false;
      setSendLocked(false);
    }
  };
  // ChatGPT-style staged attach: picking a file only adds a composer chip; the
  // upload runs when the message is sent. Up to three files can be staged.
  const stageFile = useCallback((file: File) => {
    setSendError(null);
    setStaged((prev) =>
      prev.length >= MAX_STAGED_FILES ? prev : [...prev, file],
    );
  }, []);

  const removeStaged = useCallback((index: number) => {
    setStaged((prev) => {
      const file = prev[index];
      if (file) uploadedRef.current.delete(file);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // Detaching a source from the rail. The row asks for confirmation inline
  // (never a window.confirm), the source is only dropped from the list once the
  // backend has actually deleted it, and a failure leaves the row in place with
  // the safe message underneath it.
  const handleRemoveSource = useCallback(
    async (sourceId: string) => {
      if (removingSourceId) return;
      setRemovingSourceId(sourceId);
      setRemoveErrors((prev) => {
        const next = { ...prev };
        delete next[sourceId];
        return next;
      });
      const result = await deletePrivateDocumentSource(sourceId);
      setRemovingSourceId(null);
      setConfirmRemoveId(null);
      if (!result.success) {
        setRemoveErrors((prev) => ({
          ...prev,
          [sourceId]: result.message,
        }));
        return;
      }
      // A removed source can never become ready, so it leaves any pending
      // extraction selection before the authoritative list is re-read.
      dropSource(sourceId);
      await refreshSources();
    },
    [removingSourceId, dropSource, refreshSources],
  );

  const handleSaveNotes = async () => {
    if (!notesText.trim() || notesBusy) return;
    const id = await ensureProposal();
    if (!id) return;
    const saved = await submitNotes(
      notesText,
      'non_confidential',
      id,
    );
    if (saved) {
      setNotesText('');
      setNotesOpen(false);
    }
  };

  const runExtract = async () => {
    if (readySources.length === 0 || sending || !proposalId) return;
    await sendMessage({
      content: taskContent.extract_requirements,
      intent: 'extract_requirements',
      sourceIds: readySources.slice(0, 5).map((source) => source.id),
    });
  };

  const retryFailedExtraction = async (message: ConversationMessage) => {
    if (!proposalId || retryingExtractionId) return;
    const sourceIds = sourceIdsForFailedExtraction(messages, message);
    if (sourceIds.length === 0) return;
    setRetryingExtractionId(message.id);
    try {
      await sendMessage({
        content: taskContent.extract_requirements,
        intent: 'extract_requirements',
        sourceIds,
      });
    } finally {
      setRetryingExtractionId(null);
    }
  };

  const sendDraftMessage = async (version: number) => {
    setDraftRequestBaseline(latestDraftActivity?.ordinal ?? -1);
    const sent = await sendMessage({
      content: taskContent.generate_draft,
      intent: 'generate_draft',
      expectedProposalVersion: version,
    });
    if (!sent) setDraftRequestBaseline(null);
  };

  const runDraft = async () => {
    if (
      typeof proposalVersion !== 'number' ||
      sending ||
      draftInProgress ||
      !proposalId
    )
      return;
    await sendDraftMessage(proposalVersion);
  };

  // Same code path as the rail's "Generate draft" chip, and the single handler
  // behind every card-level generate/regenerate action. A card can be clicked
  // before the version lookup settled — in that case the CURRENT version is
  // re-read first so the draft never runs against a stale one.
  const runDraftFromCard = async () => {
    if (!proposalId || sending || draftBusy || draftInProgress) return;
    setDraftError(null);
    let version = proposalVersion;
    if (typeof version !== 'number') {
      setDraftBusy(true);
      version = await fetchProposalVersion(proposalId);
      setDraftBusy(false);
      if (typeof version === 'number') setProposalVersion(version);
    }
    if (typeof version !== 'number') {
      setDraftError(
        'I couldn’t confirm the current version of your proposal. Open the editor, review the details, and try again.',
      );
      return;
    }
    await sendDraftMessage(version);
  };

  // One-click generation: arriving with ?task=generate_draft (the workflow
  // shell's "Create my first draft" CTA) triggers the same handler as the
  // rail's Generate draft chip exactly once, then strips the param from the
  // URL so a refresh or back-navigation cannot start a second draft.
  const autoTaskFired = useRef(false);
  useEffect(() => {
    if (
      autoTask !== 'generate_draft' ||
      autoTaskFired.current ||
      !proposalId
    )
      return;
    // Wait for the workspace to be idle: runDraftFromCard silently no-ops
    // while another run is in flight (e.g. the arrival readiness check),
    // which would consume this one-shot without generating anything — and a
    // draft run racing a concurrent run can fail on the version guard. The
    // busy flags are deps, so the effect retries as they settle.
    if (sending || draftBusy) return;
    autoTaskFired.current = true;
    window.history.replaceState(null, '', window.location.pathname);
    void runDraftFromCard();
    // runDraftFromCard is recreated per render; the fired ref makes this one-shot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTask, proposalId, sending, draftBusy]);

  // Closes the current run of typed messages into a source and starts
  // extraction, rather than waiting for the idle timer to do it.
  const runUseMessages = async () => {
    if (!proposalId || segmentBusy) return;
    setSegmentBusy(true);
    const result = await closeConversationSegmentAction(proposalId);
    setSegmentBusy(false);
    setLocalCards((prev) => [
      ...prev,
      result.success
        ? {
            id: crypto.randomUUID(),
            kind: 'segment',
            created: result.data.created,
            reason: result.data.reason,
          }
        : {
            id: crypto.randomUUID(),
            kind: 'error',
            message: result.message,
          },
    ]);
    // A new source and its extraction run only show up on a refresh.
    if (result.success && result.data.created) await refreshSources();
  };

  // Both reports are persisted server-side, but the thread only ever held the
  // copy produced in this tab, so a refresh silently discarded findings and the
  // investment estimate and the planner had to run them again. Restore the
  // latest of each on load, once.
  const restoredReportsRef = useRef<string | null>(null);
  useEffect(() => {
    if (!proposalId || restoredReportsRef.current === proposalId)
      return;
    restoredReportsRef.current = proposalId;
    let active = true;
    void (async () => {
      const [guidance, investment] = await Promise.all([
        getLatestGuidanceAction(proposalId),
        getLatestInvestmentGuidanceAction(proposalId),
      ]);
      if (!active) return;
      setLocalCards((prev) => {
        const restored: LocalCard[] = [];
        if (
          guidance.success &&
          guidance.data &&
          !prev.some((card) => card.kind === 'guidance')
        )
          restored.push({
            id: `restored-guidance-${proposalId}`,
            kind: 'guidance',
            report: guidance.data,
          });
        if (
          investment.success &&
          investment.data &&
          !prev.some((card) => card.kind === 'investment')
        )
          restored.push({
            id: `restored-investment-${proposalId}`,
            kind: 'investment',
            report: investment.data,
          });
        return restored.length ? [...restored, ...prev] : prev;
      });
    })();
    return () => {
      active = false;
    };
  }, [proposalId]);

  const runGuidance = async () => {
    if (!proposalId || guidanceBusy) return;
    setGuidanceBusy(true);
    const result = await generateGuidanceAction(proposalId);
    setGuidanceBusy(false);
    setLocalCards((prev) => [
      ...prev,
      result.success
        ? {
            id: crypto.randomUUID(),
            kind: 'guidance',
            report: result.data,
          }
        : {
            id: crypto.randomUUID(),
            kind: 'error',
            message: result.message,
          },
    ]);
  };

  const runInvestment = async () => {
    if (!proposalId || investmentBusy) return;
    setInvestmentBusy(true);
    const result = await generateInvestmentGuidanceAction(proposalId);
    setInvestmentBusy(false);
    setLocalCards((prev) => [
      ...prev,
      result.success
        ? {
            id: crypto.randomUUID(),
            kind: 'investment',
            report: result.data,
          }
        : {
            id: crypto.randomUUID(),
            kind: 'error',
            message: result.message,
          },
    ]);
  };

  workspaceActionRefs.current = {
    generate_draft: runDraftFromCard,
    readiness: runGuidance,
    investment: runInvestment,
    use_messages: runUseMessages,
    extract_requirements: runExtract,
  };

  // Guided question flow: answer the current question inline; a success
  // confirms the value and advances, a validation failure (422) re-asks with
  // the friendly message. Skip dismisses the question and advances.
  // A gap question stays open (and keeps its id) for its whole lifetime — it
  // is only superseded once its target field is actually filled — so showing
  // it the instant a source is attached surfaces a blank control that only
  // fills in on refresh once extraction lands. Cover the whole window: the
  // client-side scan watch, the optimistic extract_requirements send, and the
  // persisted run before it reaches a terminal status. Each clears on success
  // or failure, so a question can never stay hidden past a terminal outcome.
  const extractionPending = sourceExtractionInProgress;
  const currentVenueSchedule =
    proposal && isRecord(proposal.venueSchedule)
      ? proposal.venueSchedule
      : {};
  const currentLoadInDate =
    typeof currentVenueSchedule.loadInDate === 'string'
      ? currentVenueSchedule.loadInDate
      : undefined;
  const currentLoadInTime =
    typeof currentVenueSchedule.loadInTime === 'string'
      ? currentVenueSchedule.loadInTime
      : undefined;
  // Answers persist, so the resolved count must come from the conversation and
  // not only from this session — otherwise a refresh hides the progress card on
  // a proposal whose questions were all answered earlier.
  const resolvedQuestions = activeQuestions.filter(
    (question) => question.status !== 'open',
  ).length;
  const answeredTotal = Math.max(
    answeredCount + skippedCount,
    resolvedQuestions,
  );
  const questionProgressCurrent = answeredTotal + 1;
  const questionsComplete =
    answeredTotal > 0 &&
    !loading &&
    !!data &&
    openQuestions.length === 0;

  // Finishing the questions is a progress moment, so the card reports real
  // numbers: the guidance engine is deterministic and synchronous, so it is run
  // once per proposal+version. The ref (not state) is the guard, so a re-render
  // can never refire it; a later version bump refreshes the report exactly once.
  // A failure leaves the report null and the card falls back to a plain
  // headline — the flow is never blocked and no raw error is shown.
  useEffect(() => {
    if (!questionsComplete || !proposalId) return;
    const version =
      typeof proposalVersion === 'number' ? proposalVersion : null;
    const previous = completionRunRef.current;
    const stale =
      !previous ||
      previous.proposalId !== proposalId ||
      (version !== null &&
        previous.version !== null &&
        previous.version !== version);
    if (!stale) return;
    completionRunRef.current = { proposalId, version };
    let active = true;
    setCompletionChecking(true);
    void (async () => {
      try {
        const result = await generateGuidanceAction(proposalId);
        if (!active) return;
        setCompletionReport(result?.success ? result.data : null);
        // The report knows the version it was computed for; recording it keeps
        // the "version changed" refresh accurate even if the lookup lagged.
        if (result?.success)
          completionRunRef.current = {
            proposalId,
            version: result.data.proposalVersion || version,
          };
      } catch {
        if (active) setCompletionReport(null);
      } finally {
        if (active) setCompletionChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [questionsComplete, proposalId, proposalVersion]);

  const answerCurrentQuestion = async (
    answer: ConversationQuestionAnswer,
  ) => {
    if (!currentQuestion) return;
    const question = currentQuestion;
    const resolved = await resolveQuestion(question.id, {
      status: 'answered',
      answer,
    });
    if (resolved) {
      setAnsweredCount((count) => count + 1);
      setLastConfirmed({
        label: questionFieldLabel(question),
        value:
          typeof answer === 'string'
            ? answer
            : `${answer.date} at ${answer.time}`,
      });
    }
  };

  const skipCurrentQuestion = async () => {
    if (!currentQuestion) return;
    const question = currentQuestion;
    const resolved = await resolveQuestion(question.id, {
      status: 'dismissed',
    });
    if (!resolved) return;
    setSkippedCount((count) => count + 1);
    // Leave a trace with a way back, so skipping is deferral rather than a
    // silent, unrecoverable decision.
    const target =
      question.paths.length === 1
        ? stepForPath(question.paths[0])
        : undefined;
    setLocalCards((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        kind: 'skipped',
        label: questionFieldLabel(question),
        step: target?.step,
        stepLabel: target?.label,
      },
    ]);
  };

  // A readiness report already on screen (the completion card's own numbers, or
  // a card produced by the rail action) retires the secondary button so the
  // user is never offered a check whose result they are already reading.
  const guidanceDisplayed =
    !!completionReport ||
    localCards.some((card) => card.kind === 'guidance');

  const onComposerKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void handleSend();
    }
  };

  const renderMessage = (message: ConversationMessage) => {
    if (message.role === 'system_event') {
      return (
        <li
          key={message.id}
          className="text-center text-xs text-slate-400"
        >
          {message.content}
        </li>
      );
    }
    const mine = message.role === 'user';
    if (mine) {
      // An answer on its own ("2027-04-14") carries no meaning, so the question
      // it resolved is replayed above it as quiet, assistant-side history.
      const asked =
        message.kind === 'question_answer'
          ? (askedByAnswerMessageId.get(message.id) ?? null)
          : null;
      const askedImpact = asked?.impact
        ? impactLabels[asked.impact]
        : null;
      return (
        <li key={message.id} className="flex flex-col gap-1.5">
          {asked && (
            <div className="flex justify-start">
              <div className="max-w-[90%] py-1 text-sm text-slate-600 md:max-w-[75%] md:rounded-2xl md:rounded-bl-md md:border md:border-slate-200 md:bg-white md:px-4 md:py-2.5">
                <p className="mb-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Asked
                  {askedImpact && (
                    <span className="font-semibold normal-case tracking-normal text-slate-400">
                      · {askedImpact}
                    </span>
                  )}
                </p>
                <p className="whitespace-pre-wrap">{asked.prompt}</p>
              </div>
            </div>
          )}
          <div className="flex justify-end">
              <div className="max-w-[88%] rounded-2xl rounded-br-md border border-[#00c2c9]/30 bg-[#00c2c9]/10 px-4 py-2.5 text-sm text-slate-900 sm:max-w-[75%]">
              {message.kind === 'question_answer' && (
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#087f69]">
                  Answer
                </p>
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.attachments.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {message.attachments.map((attachment) => (
                    <li
                      key={attachment.sourceId}
                      className="rounded-full border border-[#00c2c9]/40 bg-white px-2 py-0.5 text-xs text-slate-600"
                    >
                      <span
                        className="max-w-[10rem] truncate align-middle"
                        title={attachment.filename}
                      >
                        {attachment.filename || 'Attached source'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </li>
      );
    }
    const labels = message.runType
      ? runLabels[message.runType]
      : null;
    if (!labels && message.status === 'pending') {
      return wrapAssistantTurn(
        <TypingIndicator label="The assistant is responding" />,
        message.id,
        true,
      );
    }
    if (!labels && message.status === 'failed') {
      return wrapAssistantTurn(
        <p
          role="alert"
          className="w-full max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {message.content ||
            'The assistant could not complete this response. Please try again.'}
        </p>,
        message.id,
      );
    }
    if (labels && message.status === 'pending') {
      return wrapAssistantTurn(
        <SkeletonCard label={labels.pending} />,
        message.id,
        true,
      );
    }
    if (labels && message.status === 'failed') {
      const extractionSourceIds =
        message.runType === 'proposal_context'
          ? sourceIdsForFailedExtraction(messages, message)
          : [];
      return wrapAssistantTurn(
        <div
          className="w-full max-w-3xl rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          <p role="alert">{labels.failed}</p>
          {message.runType === 'proposal_context' && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void retryFailedExtraction(message)}
                disabled={
                  extractionSourceIds.length === 0 ||
                  retryingExtractionId === message.id
                }
                aria-busy={retryingExtractionId === message.id}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {retryingExtractionId === message.id && (
                  <Loader2 size={12} className="animate-spin" aria-hidden />
                )}
                Retry extraction
              </button>
              <button
                type="button"
                onClick={() =>
                  setContinuedAfterExtractionFailure((current) =>
                    current.includes(message.id)
                      ? current
                      : [...current, message.id],
                  )
                }
                className="min-h-9 text-xs font-semibold text-red-800 underline underline-offset-2"
              >
                Continue without extraction
              </button>
              {extractionSourceIds.length === 0 && (
                <span className="text-xs text-red-700">
                  The original sources are no longer attached. Add them again to retry.
                </span>
              )}
            </div>
          )}
        </div>,
        message.id,
      );
    }
    if (
      message.runType === 'proposal_context' &&
      message.status === 'complete' &&
      proposalId
    ) {
      return wrapAssistantTurn(
        <ContextRunCard
          proposalId={proposalId}
          message={message}
          sourcesById={sourcesById}
        />,
        message.id,
      );
    }
    if (
      message.runType === 'proposal_draft' &&
      message.status === 'complete' &&
      proposalId
    ) {
      if (message.id !== latestCompleteDraft?.id) {
        return wrapAssistantTurn(
          <PreviousDraftCard message={message} />,
          message.id,
        );
      }
      return wrapAssistantTurn(
        <DraftRunCard
          proposalId={proposalId}
          message={message}
          currentProposalVersion={proposalVersion}
          draftBusy={draftBusy || chatBusy}
          onRegenerate={() => void runDraftFromCard()}
          updated={completedDraftMessages.length > 1}
        />,
        message.id,
      );
    }
    return wrapAssistantTurn(
      <div className="w-full max-w-3xl py-1 text-sm leading-6 text-slate-800 md:rounded-2xl md:border md:border-slate-200 md:bg-white md:p-4 md:leading-normal md:shadow-sm">
        <p className="whitespace-pre-wrap">{message.content}</p>
        {(message.actions?.length ?? 0) > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            {message.actions?.includes(
              'download_room_schedule_template',
            ) && (
              <a
                href="/files/RFPilot%20schedule-example-sheet.xlsx"
                download
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#008ad2] px-3 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-[#006fa8] sm:w-auto"
              >
                <Download size={14} aria-hidden />
                Download Sample Sheet
              </a>
            )}
            {message.actions?.includes('open_room_specifications') &&
              proposalId && (
                <Link
                  href={`/proposals/proposal-edit?proposalId=${encodeURIComponent(proposalId)}&step=3`}
                  className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#008ad2] bg-white px-3 py-2 text-center text-xs font-semibold text-[#008ad2] transition-colors hover:bg-[#008ad2]/5 sm:w-auto"
                >
                  <Upload size={14} aria-hidden />
                  Open Room Specifications &amp; Upload
                </Link>
              )}
          </div>
        )}
      </div>,
      message.id,
    );
  };

  const notesPresentation = notesJob ? presentJob(notesJob) : null;
  const uploadPresentation = uploadJob ? presentJob(uploadJob) : null;
  // Attaching only stages a chip, so the pickers stay enabled while scans run;
  // they are disabled once three files are staged or while a send uploads.
  const attachDisabled =
    staged.length >= MAX_STAGED_FILES || sendBusy;
  const attachDisabledTitle = attachDisabled
    ? sendBusy
      ? 'Wait for the current send to finish.'
      : `You can attach up to ${MAX_STAGED_FILES} files per message.`
    : undefined;

  const composer = (
    <div className="w-full">
      {sendBusy && (
        <p
          role="status"
          className="mb-2 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm"
        >
          <Loader2
            size={13}
            className="animate-spin text-[#00c2c9]"
            aria-hidden
          />
          Uploading{' '}
          {staged.length === 1
            ? 'your attachment'
            : 'your attachments'}
          …
        </p>
      )}
      {sendError && (
        <p
          role="alert"
          className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
        >
          <span className="min-w-0 truncate" title={sendError}>
            {sendError}
          </span>
          <button
            type="button"
            onClick={() => void handleSend()}
            className="shrink-0 font-semibold underline underline-offset-2"
          >
            Retry
          </button>
        </p>
      )}
      {inputClarification && (
        <p
          role="alert"
          className="mb-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
          {inputClarification}
        </p>
      )}
      {isListening || isTranscribing ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50/90 p-4 shadow-sm sm:p-5">
          <p className="mb-4 text-center text-lg font-semibold text-slate-900">
            {isTranscribing ? 'Transcribing…' : 'Ready when you are.'}
          </p>
          <div
            role="status"
            aria-label={isTranscribing ? 'Voice input is transcribing' : 'Voice input is listening'}
            className="flex min-h-14 items-center gap-3 rounded-[1.75rem] border border-slate-700 bg-[#202020] px-2.5 py-2 text-white shadow-lg"
          >
            {isTranscribing ? (
            <>
              <span className="min-w-0 flex-1 px-3 text-sm font-medium text-slate-300">
                Transcribing
              </span>
              <Loader2 size={20} className="shrink-0 animate-spin text-slate-300" aria-hidden />
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 text-slate-400">
                <ArrowUp size={17} aria-hidden />
              </span>
            </>
            ) : (
              <>
                <button
                  type="button"
                  aria-label="Cancel voice input"
                  onClick={cancelVoiceInput}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <X size={19} aria-hidden />
                </button>
                <div className="flex min-w-0 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden>
                  {Array.from({ length: 44 }, (_, index) => (
                    <span
                      key={index}
                      className="w-[3px] shrink-0 animate-pulse rounded-full bg-slate-300/80"
                      style={{
                        height: `${6 + ((index * 7) % 22)}px`,
                        animationDelay: `${(index % 9) * 70}ms`,
                        animationDuration: `${650 + (index % 5) * 90}ms`,
                      }}
                    />
                  ))}
                </div>
                <span className="sr-only">Listening. Speak naturally.</span>
                <button
                  type="button"
                  aria-label="Finish voice input"
                  onClick={finishVoiceInput}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white text-[#202020] transition-colors hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <Square size={13} fill="currentColor" aria-hidden />
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-1.5 shadow-[0_8px_28px_-18px_rgba(15,23,42,0.55)] transition-[border-color,box-shadow] duration-200 focus-within:border-[#00c2c9] focus-within:shadow-[0_0_0_3px_rgba(0,194,201,0.12)] md:rounded-2xl md:p-2 md:shadow-sm">
        {staged.length > 0 && (
          <ul className="mb-1.5 flex flex-wrap gap-1.5 px-1 pt-1">
            {staged.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700"
              >
                <FileText
                  size={12}
                  className="shrink-0 text-slate-400"
                  aria-hidden
                />
                <span
                  className="max-w-[10rem] truncate"
                  title={file.name}
                >
                  {file.name}
                </span>
                <span className="shrink-0 text-[10px] text-slate-400">
                  {formatFileSize(file.size)}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => removeStaged(index)}
                  disabled={sendBusy}
                  className="shrink-0 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <X size={12} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.csv,.txt"
            className="hidden"
            aria-label="Attach a file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) stageFile(file);
              event.target.value = '';
            }}
          />
          <button
            type="button"
            aria-label="Attach a file"
            onClick={() => fileInputRef.current?.click()}
            disabled={attachDisabled}
            title={attachDisabledTitle}
            className="shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Paperclip size={17} aria-hidden />
          </button>
          {voiceInputEnabled ? (
            <button
              type="button"
              aria-label="Start voice input"
              onClick={() => startVoiceInput()}
              disabled={sendBusy}
              title="Describe your event by voice"
              className="shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Mic size={17} aria-hidden />
            </button>
          ) : null}
          <textarea
            ref={composerRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onComposerKeyDown}
            rows={1}
            placeholder="Describe your event or ask for help…"
            aria-label="Message the proposal assistant"
            className="max-h-40 min-w-0 flex-1 resize-none bg-transparent py-2 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400 max-sm:!h-9 max-sm:!max-h-9 max-sm:overflow-x-auto max-sm:overflow-y-hidden max-sm:whitespace-nowrap max-sm:text-[11px] max-sm:leading-5"
          />
          <button
            type="button"
            aria-label="Send message"
            aria-busy={chatBusy || sendBusy || sendLocked}
            title={chatBusy || sendBusy || sendLocked ? 'Sending message' : 'Send message'}
            onClick={() => void handleSend()}
            disabled={
              (!text.trim() && staged.length === 0) ||
              chatBusy ||
              sendBusy ||
              sendLocked
            }
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/30 p-0 text-white shadow-[0_5px_14px_-5px_rgba(8,145,150,0.85)] transition-[transform,box-shadow,filter,opacity] duration-150 hover:-translate-y-0.5 hover:brightness-105 hover:shadow-[0_8px_18px_-6px_rgba(8,145,150,0.9)] active:translate-y-0 active:scale-90 active:shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:translate-y-0 disabled:scale-100 disabled:opacity-55 disabled:shadow-none"
            style={{
              background: `linear-gradient(135deg, ${ACCENT} 0%, ${DEEP} 100%)`,
            }}
          >
            {chatBusy || sendBusy || sendLocked ? (
              <Loader2 size={17} className="animate-spin" aria-hidden />
            ) : (
              <ArrowUp size={17} strokeWidth={2.4} aria-hidden />
            )}
          </button>
        </div>
      </div>
      )}
      {voiceError && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {voiceError}
        </p>
      )}
      {createError && (
        <p
          role="alert"
          className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-800"
        >
          {createError}
        </p>
      )}
    </div>
  );

  const aiWorking =
    chatBusy ||
    autoScanning ||
    draftBusy ||
    draftInProgress ||
    guidanceBusy ||
    investmentBusy;
  const aiStatus = autoScanning
    ? {
        title: 'Reading your sources',
        detail: 'Checking evidence and preparing requirements.',
      }
    : draftBusy || draftInProgress
      ? {
          title: latestCompleteDraft
            ? 'Updating your draft'
            : 'Writing your draft',
          detail:
            'Building cited sections from your latest proposal details.',
        }
      : guidanceBusy
        ? {
            title: 'Checking readiness',
            detail:
              'Reviewing completeness, risks, and open decisions.',
          }
        : investmentBusy
          ? {
              title: 'Building investment guidance',
              detail: 'Calculating a scope-based planning range.',
            }
          : chatBusy
            ? {
                title: 'Thinking through your request',
                detail:
                  'The assistant is preparing the next response.',
              }
            : {
                title: 'Ready to help',
                detail:
                  'Add information or choose a suggested next step.',
              };

  return (
    <div className="h-[calc(100dvh-8.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] min-h-0 overflow-hidden bg-white md:h-auto md:min-h-[calc(100svh-9rem)] md:overflow-visible md:bg-white md:py-2 lg:bg-slate-100/70 xl:flex xl:h-[calc(100dvh-3rem)] xl:min-h-0 xl:flex-col xl:overflow-hidden">
      {/* Shared keyframes for continuous status indicators. */}
      <style>{`
        @keyframes typing-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.45; } 30% { transform: translateY(-0.25rem); opacity: 1; } }
        @keyframes ai-glow { 0%, 100% { opacity: 0.35; transform: scale(0.9); } 50% { opacity: 0.75; transform: scale(1.08); } }
        @keyframes ai-orbit { to { transform: rotate(360deg); } }
      `}</style>
      {/* Top bar */}
      <div className="mx-auto hidden w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-1 pb-4 md:flex">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-sm"
        >
          <Link
            href="/proposals"
            aria-label="Back to all proposals"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2"
          >
            <ArrowLeft size={14} aria-hidden />
            All proposals
          </Link>
          <span aria-hidden className="text-slate-300">
            /
          </span>
          <span className="font-semibold text-slate-900">
            {proposalId ? eventName || 'Untitled proposal' : 'New proposal'}
          </span>
        </nav>
        {/* No proposal exists until the conversation starts, so the edit
            escape hatch only appears once there is something to edit. */}
        {proposalId && (
          <Link
            href={`/proposals/proposal-edit?proposalId=${proposalId}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            <PencilLine size={14} aria-hidden />
            Open RFP questions
          </Link>
        )}
      </div>

      <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-0 md:h-auto md:gap-5 xl:min-h-0 xl:flex-1 xl:flex-row">
        {/* Workspace card */}
        {/* The card is height-bounded so the thread scrolls inside it and the
            composer stays put, instead of the whole page growing. */}
        <section
          aria-label="Proposal assistant workspace"
          className="order-2 flex h-full min-h-0 max-h-none flex-1 flex-col overflow-hidden border-0 bg-white p-0 shadow-none md:h-[calc(100svh-18rem)] md:min-h-[30rem] md:max-h-[calc(100svh-18rem)] md:rounded-3xl md:border md:border-slate-200 md:p-6 md:shadow-sm lg:h-[calc(100svh-10rem)] lg:min-h-[36rem] lg:max-h-[calc(100svh-10rem)] lg:p-7 xl:order-1 xl:h-full xl:min-h-0 xl:max-h-none"
        >
          {!started ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-6 py-6 text-center md:justify-center md:gap-6 md:p-0">
                <AssistantOrb />
                <div>
                  <h1 className="text-balance text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                    {/* The profile resolves after mount, so server and first
                        client render use the same timezone-neutral greeting. */}
                    {firstName ? `Good ${dayPart()}, ${firstName}` : 'Welcome'}
                  </h1>
                  <p
                    className="mt-2 text-base font-semibold md:text-xl"
                    style={{ color: ACCENT }}
                  >
                    Let’s build your event RFP
                  </p>
                  <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-slate-600">
                    Describe your event or attach a brief to get started.
                  </p>
                </div>
              </div>
              <div className="w-full shrink-0 bg-white px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 md:mx-auto md:max-w-xl md:bg-transparent md:p-0">
                {composer}
              </div>
            </div>
          ) : (
            <>
              <div
                data-testid="proposal-conversation-scroll"
                className="min-h-0 flex-1 scroll-py-4 overflow-y-auto px-4 pb-4 pt-4 md:-mr-3 md:px-0 md:pb-0 md:pr-4 md:pt-0"
                aria-live="polite"
              >
                {loadError && (
                  <p
                    role="alert"
                    className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"
                  >
                    {loadError}
                  </p>
                )}
                {loading && pending.length === 0 && messages.length === 0 && (
                  <p role="status" className="text-sm text-slate-500">
                    Loading the conversation…
                  </p>
                )}
                <ol className="space-y-3">
                  {threadMessages.map(renderMessage)}
                  {showOverview && proposalId && (
                    <li className="flex justify-start">
                      <OverviewCard
                        proposalId={proposalId}
                        eventName={eventName}
                        rows={overviewRows}
                        detailCount={overviewDetailCount}
                        detailSource={overviewDetailSource}
                        pendingReview={overviewPendingReview}
                        busy={draftBusy || sending || draftInProgress}
                        error={draftError}
                        showActions={!questionsComplete}
                        hasDraft={hasDraftRun}
                        onGenerateDraft={() =>
                          void runDraftFromCard()
                        }
                        onRunReadiness={
                          guidanceDisplayed
                            ? undefined
                            : () => void runGuidance()
                        }
                        readinessBusy={guidanceBusy}
                      />
                    </li>
                  )}
                  {localCards.map((card) => (
                    <li key={card.id} className="flex justify-start">
                      {card.kind === 'guidance' && (
                        <GuidanceCard report={card.report} />
                      )}
                      {card.kind === 'investment' && (
                        <InvestmentCard
                          report={card.report}
                          declaredBudget={budgetTierLabel(proposal)}
                        />
                      )}
                      {card.kind === 'segment' && (
                        // Extraction from typed messages is otherwise silent:
                        // a source and applied fields would simply appear.
                        <p
                          role="status"
                          className="w-full rounded-2xl border border-violet-200 bg-violet-50 p-3 text-sm text-violet-900 sm:max-w-[85%]"
                        >
                          {card.created
                            ? "I saved what you've told me as a source and I'm pulling requirements from it. Anything I'm unsure about will come back as a question."
                            : (segmentSkipReasons[
                                card.reason ?? ''
                              ] ??
                              "There's nothing new for me to read yet.")}
                        </p>
                      )}
                      {card.kind === 'skipped' && (
                        <p
                          role="status"
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 sm:max-w-[85%]"
                        >
                          Skipped <strong>{card.label}</strong> — you
                          can add it later.
                          {card.step && proposalId && (
                            <>
                              {' '}
                              <Link
                                href={`/proposals/proposal-edit?proposalId=${proposalId}&step=${card.step}`}
                                className="font-semibold text-[#008ad2] underline underline-offset-2"
                              >
                                Open {card.stepLabel}
                              </Link>
                            </>
                          )}
                        </p>
                      )}
                      {card.kind === 'error' && (
                        <p
                          role="alert"
                          className="w-full rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:max-w-[85%]"
                        >
                          {card.message}
                        </p>
                      )}
                    </li>
                  ))}
                  {unsentPending.map((entry) => (
                    <li
                      key={entry.localId}
                      className="flex justify-end"
                    >
                      <div className="max-w-[88%] rounded-2xl rounded-br-md border border-[#00c2c9]/30 bg-[#00c2c9]/10 px-4 py-2.5 text-sm text-slate-900 opacity-90 sm:max-w-[75%]">
                        <p className="whitespace-pre-wrap">
                          {entry.content}
                        </p>
                        {entry.state === 'sending' && (
                          <p
                            role="status"
                            className="mt-1 text-xs text-slate-500"
                          >
                            Sending…
                          </p>
                        )}
                        {entry.state === 'failed' && (
                          <p
                            role="alert"
                            className="mt-1 text-xs text-red-700"
                          >
                            {entry.errorMessage ??
                              'The message could not be sent.'}{' '}
                            <button
                              type="button"
                              onClick={() =>
                                void retrySend(entry.localId)
                              }
                              className="font-semibold underline underline-offset-2"
                            >
                              Retry
                            </button>
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                  {failedNotices.map((notice) => (
                    <li
                      key={notice.sourceId}
                      className="flex justify-start"
                    >
                      <p
                        role="alert"
                        className="w-full rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:max-w-[85%]"
                      >
                        {`${notice.filename} couldn’t be processed — try re-uploading.`}
                      </p>
                    </li>
                  ))}
                  {nonDraftSending && !assistantResponding && (
                    <li className="flex justify-start">
                      <TypingIndicator label="The assistant is responding" />
                    </li>
                  )}
                  {autoScanning && !sending && (
                    <li className="flex justify-start">
                      <p
                        role="status"
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-500 shadow-sm"
                      >
                        Checking your{' '}
                        {scanCount === 1 ? 'file' : 'files'}…
                        <span
                          aria-hidden
                          className="ml-0.5 flex items-center gap-0.5"
                        >
                          {[0, 1, 2].map((dot) => (
                            <span
                              key={dot}
                              className="h-1 w-1 rounded-full bg-[#00c2c9] motion-safe:animate-[typing-bounce_1.2s_ease-in-out_infinite]"
                              style={{
                                animationDelay: `${dot * 150}ms`,
                              }}
                            />
                          ))}
                        </span>
                      </p>
                    </li>
                  )}
                  {(guidanceBusy || investmentBusy) && (
                    <li className="flex justify-start">
                      <SkeletonCard
                        label={
                          guidanceBusy
                            ? 'Running the readiness check…'
                            : 'Preparing investment guidance…'
                        }
                      />
                    </li>
                  )}
                  {bulkAnswerProgress && (
                    <li className="flex justify-start">
                      <p
                        role="status"
                        className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-[#00c2c9]/30 bg-[#00c2c9]/10 px-3.5 py-2 text-xs font-semibold text-[#087f69]"
                      >
                        <Loader2 size={13} className="animate-spin" aria-hidden />
                        Saving {bulkAnswerProgress.current} of {bulkAnswerProgress.total} details…
                      </p>
                    </li>
                  )}
                  {lastConfirmed && (
                    <li className="flex justify-start">
                      <p
                        role="status"
                        className="inline-flex max-w-full items-center gap-1.5 whitespace-normal break-words rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800"
                      >
                        {lastConfirmed.label}: {lastConfirmed.value} ✓
                      </p>
                    </li>
                  )}
                  {/* Keep the conversational turn coherent: field-gap
                      questions may synchronize before the assistant reply is
                      ready, but the next question must not jump ahead of that
                      reply in the thread. */}
                  {currentQuestion &&
                    !chatBusy &&
                    !loading &&
                    !bulkAnswerProgress &&
                    extractionPending && (
                      <li className="flex scroll-mt-4 justify-start py-1">
                        <SkeletonCard label="Reading your sources before asking the next question…" />
                      </li>
                    )}
                  {currentQuestion &&
                    !chatBusy &&
                    !loading &&
                    !bulkAnswerProgress &&
                    !extractionPending &&
                    !extractionFailureBlocksQuestions && (
                      <li className="flex scroll-mt-4 justify-start py-1">
                        <GuidedQuestionCard
                          key={currentQuestion.id}
                          question={currentQuestion}
                          current={questionProgressCurrent}
                          busy={questionBusyId === currentQuestion.id}
                          error={questionError}
                          minimumDate={minimumDateForQuestion(
                            currentQuestion,
                            proposal,
                          )}
                          maximumDate={maximumDateForQuestion(
                            currentQuestion,
                            proposal,
                          )}
                          initialDate={
                            currentQuestion.answerType === 'date_time'
                              ? currentLoadInDate
                              : undefined
                          }
                          initialTime={
                            currentQuestion.answerType === 'date_time'
                              ? currentLoadInTime
                              : undefined
                          }
                          onAnswer={(answer) =>
                            void answerCurrentQuestion(answer)
                          }
                          onSkip={() => void skipCurrentQuestion()}
                        />
                      </li>
                    )}
                  {questionsComplete && proposalId && (
                    <li className="flex justify-start">
                      <CompletionCard
                        proposalId={proposalId}
                        report={completionReport}
                        checking={completionChecking}
                        hasDraft={hasDraftRun}
                        draftBusy={draftBusy || sending || draftInProgress}
                        draftError={draftError}
                        onGenerateDraft={() =>
                          void runDraftFromCard()
                        }
                        onRunReadiness={
                          guidanceDisplayed
                            ? undefined
                            : () => void runGuidance()
                        }
                        readinessBusy={guidanceBusy}
                      />
                    </li>
                  )}
                  {draftInProgress &&
                    wrapAssistantTurn(
                      <DraftProgressCard updating={!!latestCompleteDraft} />,
                      'draft-progress',
                      true,
                    )}
                  {!draftInProgress &&
                    draftSendFailure &&
                    wrapAssistantTurn(
                      <DraftSendFailureCard
                        message={
                          draftSendFailure.errorMessage ??
                          'Please try again.'
                        }
                        hasCurrentDraft={!!latestCompleteDraft}
                        onRetry={() =>
                          void retrySend(draftSendFailure.localId)
                        }
                      />,
                      'draft-send-failure',
                    )}
                  {!draftInProgress &&
                    !draftSendFailure &&
                    latestDraftActivity?.status === 'failed' &&
                    renderMessage(latestDraftActivity)}
                  {!draftInProgress &&
                    latestCompleteDraft &&
                    proposalId &&
                    wrapAssistantTurn(
                      <DraftRunCard
                        proposalId={proposalId}
                        message={latestCompleteDraft}
                        currentProposalVersion={proposalVersion}
                        draftBusy={draftBusy || chatBusy}
                        onRegenerate={() => void runDraftFromCard()}
                        updated={completedDraftMessages.length > 1}
                      />,
                      `current-draft-${latestCompleteDraft.id}`,
                    )}
                </ol>
                <div ref={threadEndRef} className="h-2 scroll-mb-4" />
              </div>
              <div className="w-full shrink-0 border-t border-slate-100 bg-white px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 md:mt-4 md:border-0 md:bg-transparent md:p-0">
                {composer}
              </div>
            </>
          )}
        </section>

        {/* The same AI Workspace content becomes a compact disclosure above
            the conversation on narrow screens. At desktop widths the details
            wrapper becomes layout-transparent and restores the right rail. */}
        {railVisible && (
          <div className="order-1 shrink-0 border-b border-slate-200 bg-white xl:order-2 xl:block xl:h-full xl:w-80 xl:border-0 xl:bg-transparent">
            <button
              type="button"
              aria-label="Toggle AI workspace tools"
              aria-expanded={toolsOpen}
              onClick={() => setToolsOpen((open) => !open)}
              className="flex min-h-12 w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#00c2c9] xl:hidden"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[#087f69]/15 bg-[#087f69]/10 text-[#087f69]">
                <Sparkles size={15} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#087f69]">
                  AI workspace
                </span>
                <span className="block truncate text-xs font-semibold text-slate-700">
                  {aiStatus.title}
                </span>
              </span>
              <ChevronDown
                size={17}
                className={`shrink-0 text-slate-400 transition-transform ${toolsOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            <aside
              aria-label="Proposal assistant tools"
              className={`${toolsOpen ? 'flex' : 'hidden'} max-h-[min(56dvh,34rem)] w-full shrink-0 flex-col overflow-hidden border-t border-slate-200 bg-slate-50/80 p-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 xl:flex xl:h-full xl:max-h-none xl:min-h-0 xl:w-full xl:rounded-3xl xl:border xl:border-slate-200/80 xl:bg-white/45 xl:shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)] xl:backdrop-blur-sm`}
            >
            <div
              data-testid="proposal-assistant-tools-scroll"
              className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable] xl:-mr-1 xl:pr-2"
            >
            <section
              aria-labelledby="rail-ai-title"
              tabIndex={0}
              className="relative overflow-hidden rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-[#062f3a] via-[#075569] to-[#087f69] p-4 text-white shadow-lg outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-[#00c2c9] focus-visible:ring-offset-2"
            >
              <div
                aria-hidden
                className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#00c2c9]/30 blur-2xl motion-safe:animate-[ai-glow_2.8s_ease-in-out_infinite]"
              />
              <div className="relative flex items-start gap-3">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10">
                  {aiWorking && (
                    <span className="absolute inset-[-4px] rounded-2xl border border-dashed border-[#67e8f9]/70 motion-safe:animate-[ai-orbit_5s_linear_infinite]" />
                  )}
                  <Sparkles size={18} aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-100">
                    AI workspace
                  </p>
                  <h2
                    id="rail-ai-title"
                    className="mt-1 text-sm font-bold"
                  >
                    {aiStatus.title}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-cyan-50/80">
                    {aiStatus.detail}
                  </p>
                </div>
              </div>
              <dl className="relative mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-white/15 bg-white/10 p-2">
                  <dt className="text-[9px] uppercase tracking-wide text-cyan-100/70">
                    Sources
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold">
                    {readySources.length}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-2">
                  <dt className="text-[9px] uppercase tracking-wide text-cyan-100/70">
                    Captured
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold">
                    {overviewDetailCount}
                  </dd>
                </div>
                <div className="rounded-xl border border-white/15 bg-white/10 p-2">
                  <dt className="text-[9px] uppercase tracking-wide text-cyan-100/70">
                    Questions
                  </dt>
                  <dd className="mt-0.5 text-sm font-bold">
                    {openQuestions.length}
                  </dd>
                </div>
              </dl>
              <div className="relative mt-3 flex items-center gap-2 text-[10px] font-semibold text-cyan-50/80">
                <span
                  className={`h-2 w-2 rounded-full ${aiWorking ? 'bg-cyan-300 motion-safe:animate-pulse' : 'bg-emerald-300'}`}
                />
                {aiWorking
                  ? 'AI is actively working'
                  : 'Secure proposal context is ready'}
              </div>
            </section>
            {/* Tool cards remain stationary so async content cannot create a
                layered or shaking entrance. */}
            <section
              aria-labelledby="rail-sources-title"
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-[border-color,box-shadow] duration-200 focus-within:border-cyan-300 focus-within:shadow-md hover:shadow-md"
            >
              <h2
                id="rail-sources-title"
                className="text-sm font-bold text-slate-900"
              >
                Sources
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Add files or notes to this proposal
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={attachDisabled}
                  title={attachDisabledTitle}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
                >
                  <Upload size={13} aria-hidden />
                  Upload file
                </button>
                <button
                  type="button"
                  onClick={() => setNotesOpen((open) => !open)}
                  aria-expanded={notesOpen}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <StickyNote size={13} aria-hidden />
                  Add notes
                </button>
              </div>
              {notesOpen && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <label className="block text-xs font-semibold text-slate-700">
                    Notes
                    <textarea
                      value={notesText}
                      onChange={(event) =>
                        setNotesText(event.target.value)
                      }
                      rows={4}
                      placeholder="Paste or type notes to attach to this proposal…"
                      className="mt-1 w-full resize-none rounded-lg border border-slate-300 bg-white p-2 text-sm font-normal"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => void handleSaveNotes()}
                    disabled={!notesText.trim() || notesBusy}
                    className="mt-2 w-full rounded-lg bg-[#087f69] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {notesBusy ? 'Saving notes…' : 'Save notes'}
                  </button>
                </div>
              )}
              {(uploadPresentation || notesPresentation) && (
                <div
                  role="status"
                  className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50 p-2.5 text-xs text-slate-700"
                >
                  {uploadPresentation && (
                    <p>
                      <span className="font-semibold">File:</span>{' '}
                      {uploadPresentation.title}
                    </p>
                  )}
                  {notesPresentation && (
                    <p className={uploadPresentation ? 'mt-1' : ''}>
                      <span className="font-semibold">Notes:</span>{' '}
                      {notesPresentation.title}
                    </p>
                  )}
                </div>
              )}
              {(uploadError || notesError) && (
                <p
                  role="alert"
                  className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-800"
                >
                  {uploadError || notesError}
                </p>
              )}
              {sources.length > 0 ? (
                <ul
                  aria-label="Attached sources"
                  className="mt-3 space-y-1.5"
                >
                  {sources.map((source) => {
                    const removing = removingSourceId === source.id;
                    const removeError = removeErrors[source.id];
                    return (
                      <li
                        key={source.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="min-w-0 basis-full truncate text-slate-700 sm:flex-1 sm:basis-auto"
                            title={source.originalFilename}
                          >
                            {source.originalFilename}
                          </span>
                          {source.origin === 'conversation' && (
                            // The planner never pressed "add this as a source" for
                            // these — the system built them from what was typed —
                            // so they must not look like an attached file.
                            <span
                              className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-800"
                              title="Built from your messages and used for extraction"
                            >
                              from chat
                            </span>
                          )}
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${source.status === 'ready' ? 'bg-emerald-100 text-emerald-800' : source.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-white text-slate-600'}`}
                          >
                            {source.status.replaceAll('_', ' ')}
                          </span>
                          {confirmRemoveId === source.id ? (
                            // Inline confirmation, so nothing leaves the page and
                            // the row keeps its own context while deciding.
                            <span className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  void handleRemoveSource(source.id)
                                }
                                disabled={removing}
                                className="rounded-full border border-red-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {removing ? 'Removing…' : 'Remove?'}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setConfirmRemoveId(null)
                                }
                                disabled={removing}
                                className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Remove ${source.originalFilename}`}
                              onClick={() => {
                                setConfirmRemoveId(source.id);
                              }}
                              disabled={!!removingSourceId}
                              className="shrink-0 rounded-full p-0.5 text-slate-300 transition-colors hover:bg-slate-200 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <X size={12} aria-hidden />
                            </button>
                          )}
                        </div>
                        {removeError && (
                          <p
                            role="alert"
                            className="mt-1 text-[11px] text-red-700"
                          >
                            {removeError}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-slate-400">
                  No sources yet. Add a file or notes to get started.
                </p>
              )}
              <p className="mt-3 text-[11px] text-slate-400">
                Files are scanned and processed privately for this
                proposal.
              </p>
            </section>

            {/* Suggested tasks */}
            <section
              aria-labelledby="rail-tasks-title"
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-[border-color,box-shadow] duration-200 focus-within:border-cyan-300 focus-within:shadow-md hover:shadow-md"
            >
              <h2
                id="rail-tasks-title"
                className="text-sm font-bold text-slate-900"
              >
                Suggested tasks
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void runUseMessages()}
                  disabled={
                    segmentBusy ||
                    sending ||
                    messages.length === 0 ||
                    !chatExtractionEnabled
                  }
                  title={
                    !chatExtractionEnabled
                      ? segmentSkipReasons.disabled
                      : messages.length === 0
                        ? 'Tell me about your event first.'
                        : "Turn what you've typed into a source and pull requirements from it."
                  }
                  aria-busy={segmentBusy}
                  className="rounded-full border border-[#087f69] px-3 py-1.5 text-xs font-semibold text-[#087f69] transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  {segmentBusy
                    ? 'Reading your messages…'
                    : "Use what I've told you"}
                </button>
                <button
                  type="button"
                  onClick={() => void runExtract()}
                  disabled={readySources.length === 0 || sending}
                  title={
                    readySources.length === 0
                      ? 'Add at least one ready source first.'
                      : undefined
                  }
                  className="rounded-full border border-[#087f69] px-3 py-1.5 text-xs font-semibold text-[#087f69] transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent"
                >
                  Extract requirements
                </button>
                <button
                  type="button"
                  onClick={() => void runDraft()}
                  aria-busy={draftInProgress}
                  disabled={
                    typeof proposalVersion !== 'number' ||
                    sending ||
                    draftInProgress
                  }
                  title={
                    typeof proposalVersion !== 'number'
                      ? 'Review extracted requirements first to establish the proposal version.'
                      : undefined
                  }
                  className="rounded-full border border-[#087f69] px-3 py-1.5 text-xs font-semibold text-[#087f69] transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent"
                >
                  {draftInProgress ? 'Generating…' : 'Generate draft'}
                </button>
                <button
                  type="button"
                  onClick={() => void runGuidance()}
                  disabled={!proposalId || guidanceBusy}
                  title={
                    !proposalId
                      ? 'Start the conversation to create the proposal first.'
                      : undefined
                  }
                  className="rounded-full border border-[#087f69] px-3 py-1.5 text-xs font-semibold text-[#087f69] transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent"
                >
                  {guidanceBusy && (
                    <Loader2
                      size={11}
                      className="mr-1 inline animate-spin"
                      aria-hidden
                    />
                  )}
                  Run readiness check
                </button>
                <button
                  type="button"
                  onClick={() => void runInvestment()}
                  disabled={!proposalId || investmentBusy}
                  title={
                    !proposalId
                      ? 'Start the conversation to create the proposal first.'
                      : undefined
                  }
                  className="rounded-full border border-[#087f69] px-3 py-1.5 text-xs font-semibold text-[#087f69] transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-transparent"
                >
                  {investmentBusy && (
                    <Loader2
                      size={11}
                      className="mr-1 inline animate-spin"
                      aria-hidden
                    />
                  )}
                  Investment guidance
                </button>
              </div>
            </section>

            {/* Suggested questions */}
            <section
              aria-labelledby="rail-questions-title"
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-[border-color,box-shadow] duration-200 focus-within:border-cyan-300 focus-within:shadow-md hover:shadow-md"
            >
              <h2
                id="rail-questions-title"
                className="text-sm font-bold text-slate-900"
              >
                Suggested questions
              </h2>
              {openQuestions.length === 0 ? (
                <p className="mt-2 text-xs text-slate-400">
                  {questionsComplete
                    ? 'All key questions answered.'
                    : 'Open clarification questions from the assistant will appear here.'}
                </p>
              ) : (
                <p className="mt-2 text-xs text-slate-600">
                  {`${openQuestions.length} ${openQuestions.length === 1 ? 'question is' : 'questions are'} open now. Follow-up questions may appear as earlier answers unlock venue details.`}
                </p>
              )}
            </section>
            </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
