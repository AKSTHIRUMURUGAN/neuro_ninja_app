import { AppState, Platform } from 'react-native';
import type { LlamaContext } from 'llama.rn';
import { voicePackManager } from '../voice/voice-pack-manager';
import { hasIndicScript, normalizeForIntent } from './indic-translator';

export type AiLanguageMode = 'auto' | 'en-IN' | 'ta-IN' | 'hi-IN';

export type NinjaIntentType =
  | 'OPEN_APP'
  | 'LOG_EXPENSE'
  | 'START_FOCUS'
  | 'ADD_TASK'
  | 'QUICK_NOTE'
  | 'NAVIGATE'
  | 'CHAT';

export interface NinjaVoiceIntent {
  intent: NinjaIntentType;
  reply: string;
  appName?: string;
  amount?: number;
  category?: string;
  merchant?: string;
  minutes?: number;
  title?: string;
  route?: string;
  tokensPerSec?: number;
  modelId?: string;
  error?: string;
}

export interface StreamCommandOptions {
  onToken?: (accumulatedText: string) => void;
  onSentence?: (sentence: string) => void;
  appNames?: string[];
  languageMode?: AiLanguageMode;
}

const IDLE_UNLOAD_MS = 120_000;
const MAX_HISTORY_MESSAGES = 8;

class LocalLlmService {
  private ctx: LlamaContext | null = null;
  private loadedModelId: string | null = null;
  private loadedPath: string | null = null;
  private loadingPromise: Promise<{ ctx: LlamaContext; modelId: string } | null> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private appStateSub: { remove: () => void } | null = null;
  private aiLanguageMode: AiLanguageMode = 'auto';
  private history: { role: 'user' | 'assistant'; content: string }[] = [];
  private isCompleting = false;

  getAiLanguageMode(): AiLanguageMode {
    return this.aiLanguageMode;
  }

  setAiLanguageMode(mode: AiLanguageMode): void {
    this.aiLanguageMode = mode;
  }

  clearConversation(): void {
    this.history = [];
  }

  private scheduleUnload(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      void this.unload();
    }, IDLE_UNLOAD_MS);
  }

  async hasLocalModel(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    const found = await voicePackManager.getInstalledLlmPath();
    return Boolean(found);
  }

  async ensureLoaded(): Promise<{ ctx: LlamaContext; modelId: string } | null> {
    if (Platform.OS === 'web') return null;
    const found = await voicePackManager.getInstalledLlmPath();
    if (!found) return null;

    if (this.ctx && this.loadedPath === found.path && this.loadedModelId) {
      this.scheduleUnload();
      return { ctx: this.ctx, modelId: this.loadedModelId };
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      await this.unload();
      const { initLlama } = await import('llama.rn');
      // NOTE: use_mlock MUST be false on Android; RLIMIT_MEMLOCK is tiny on non-rooted devices.
      const ctx = await initLlama({
        model: found.path,
        use_mlock: false,
        use_mmap: true,
        n_ctx: 1024,
        n_batch: 256,
        n_threads: 4,
      });

      this.ctx = ctx;
      this.loadedModelId = found.id;
      this.loadedPath = found.path;

      if (!this.appStateSub) {
        this.appStateSub = AppState.addEventListener('change', (state) => {
          if (state === 'background') {
            void this.unload();
          }
        });
      }

      this.scheduleUnload();
      return { ctx, modelId: found.id };
    })();

    try {
      return await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  async unload(): Promise<void> {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.ctx) {
      try {
        await this.ctx.release();
      } catch {}
      this.ctx = null;
      this.loadedModelId = null;
      this.loadedPath = null;
    }
  }

  async parseVoiceCommand(
    transcript: string,
    opts: StreamCommandOptions = {}
  ): Promise<NinjaVoiceIntent> {
    const clean = transcript.trim();
    if (!clean) {
      return { intent: 'CHAT', reply: 'I did not catch that. Please try again.' };
    }

    const normalized = normalizeForIntent(clean);

    // Fast 0ms deterministic check for English & Indic/transliterated commands
    const fastAction = this.tryFastActionIntent(normalized) || this.tryFastActionIntent(clean);
    if (fastAction) {
      const hasModel = await this.hasLocalModel();
      return {
        ...fastAction,
        modelId: hasModel ? 'Fast Action Router' : 'Rule Fallback',
      };
    }

    let loaded: { ctx: LlamaContext; modelId: string } | null = null;
    try {
      loaded = await this.ensureLoaded();
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Failed to load Qwen model';
      console.warn('[LocalLlmService] Model load failed:', errMsg);
      return {
        intent: 'CHAT',
        reply: `Local LLM load error: ${errMsg}`,
        modelId: 'Load Error',
        error: errMsg,
      };
    }

    if (!loaded) {
      return this.fallbackRuleIntent(clean);
    }

    const t0 = Date.now();
    let streamed = '';
    let spokenCursor = 0;

    if (this.isCompleting) {
      try {
        await loaded.ctx.stopCompletion();
      } catch {}
    }
    this.isCompleting = true;

    try {
      const mode = opts.languageMode || this.aiLanguageMode;
      const langHint =
        mode === 'ta-IN'
          ? 'User prefers Tamil / Tanglish. Understand Tamil & English.'
          : mode === 'hi-IN'
            ? 'User prefers Hindi / Hinglish. Understand Hindi & English.'
            : 'User speaks English or code-mixed Indian English (Tamil/Hindi). Reply in clear English.';
      const appContext =
        opts.appNames && opts.appNames.length > 0
          ? `Installed apps: ${opts.appNames.slice(0, 18).join(', ')}. `
          : '';
      const userPrompt = hasIndicScript(clean)
        ? `${clean}\n(Phonetic/Intent hint: ${normalized})`
        : clean;

      const systemMsg =
        `You are NeuroNinja, a warm, context-aware mobile AI assistant. ${langHint} ${appContext}` +
        'Stay on the current conversation subject across turns. ' +
        'If the user asks to open an app, log an expense, start focus, or add a task, reply ONLY with JSON: ' +
        '{"intent":"OPEN_APP|LOG_EXPENSE|START_FOCUS|ADD_TASK","appName":"","amount":0,"minutes":25,"title":"","reply":"short friendly confirmation"}. ' +
        'Otherwise, answer directly and conversationally in 1-3 clear sentences.';

      let res;
      try {
        res = await loaded.ctx.completion(
          {
            messages: [
              { role: 'system', content: systemMsg },
              ...this.history.slice(-MAX_HISTORY_MESSAGES),
              { role: 'user', content: userPrompt },
            ],
            n_predict: 160,
            temperature: 0.4,
            stop: ['<|im_end|>', '<|endoftext|>', '</s>'],
          },
          (data) => {
            if (!data?.token) return;
            streamed += data.token;
            opts.onToken?.(streamed);

            if (opts.onSentence && !streamed.trimStart().startsWith('{')) {
              const pending = streamed.slice(spokenCursor);
              const match = pending.match(/^([\s\S]*?[.!?])(?:\s|$)/);
              if (match && match[1].trim().length >= 8) {
                opts.onSentence(match[1].trim());
                spokenCursor += match[1].length;
              }
            }
          }
        );
      } catch (primaryErr) {
        console.warn('[LocalLlmService] Primary completion failed, retrying ChatML prompt:', primaryErr);
        const historyText = this.history
          .slice(-MAX_HISTORY_MESSAGES)
          .map((m) => `<|im_start|>${m.role}\n${m.content}<|im_end|>`)
          .join('\n');
        const fallbackPrompt =
          `<|im_start|>system\n${systemMsg}<|im_end|>\n` +
          (historyText ? `${historyText}\n` : '') +
          `<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`;
        res = await loaded.ctx.completion({
          prompt: fallbackPrompt,
          n_predict: 160,
          temperature: 0.4,
          stop: ['<|im_end|>', '<|endoftext|>', '</s>'],
        });
      }

      this.scheduleUnload();
      const raw = (res.text || streamed || '').trim();
      const elapsedSec = Math.max(0.05, (Date.now() - t0) / 1000);
      const tokSec =
        res.timings?.predicted_per_second ?? Math.round((res.tokens_predicted || 0) / elapsedSec);

      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]) as Partial<NinjaVoiceIntent>;
          const reply = (parsed.reply || 'Done!').trim();
          if (opts.onSentence && spokenCursor === 0 && reply) {
            opts.onSentence(reply);
          }
          return {
            intent: parsed.intent || 'CHAT',
            reply,
            appName: parsed.appName,
            amount: typeof parsed.amount === 'number' ? parsed.amount : undefined,
            category: parsed.category,
            merchant: parsed.merchant,
            minutes: typeof parsed.minutes === 'number' ? parsed.minutes : undefined,
            title: parsed.title,
            tokensPerSec: tokSec,
            modelId: loaded.modelId,
          };
        } catch {
          // Fall through to plain-text chat reply
        }
      }

      // Plain conversational response (stories, Q&A, greetings, etc.)
      const tail = raw.slice(spokenCursor).trim();
      if (opts.onSentence && tail) {
        opts.onSentence(tail);
      }
      const replyText = raw || 'I am here! How can I help?';
      this.history.push(
        { role: 'user', content: clean },
        { role: 'assistant', content: replyText }
      );
      if (this.history.length > MAX_HISTORY_MESSAGES) {
        this.history = this.history.slice(-MAX_HISTORY_MESSAGES);
      }

      return {
        intent: 'CHAT',
        reply: replyText,
        tokensPerSec: tokSec,
        modelId: loaded.modelId,
      };
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Inference error';
      console.warn('[LocalLlmService] Inference failed:', errMsg);
      return {
        intent: 'CHAT',
        reply: `Local LLM error: ${errMsg}`,
        modelId: loaded.modelId,
        error: errMsg,
      };
    } finally {
      this.isCompleting = false;
    }
  }

  private tryFastActionIntent(text: string): NinjaVoiceIntent | null {
    const lower = text.toLowerCase().trim();
    const focusMatch = lower.match(/(\d+)\s*(?:min|minute|minutes|m)\s*(?:focus|pomodoro|timer)?/i);
    const expenseMatch = lower.match(
      /(?:spent|paid|log|expense|rs|₹)\s*(\d+(?:\.\d+)?)\s*(?:rupees|rs|₹)?\s*(?:on|for|at)?\s*(.*)/i
    );
    const taskMatch = lower.match(/^(?:add task|create task|remind me to|todo)\s+(.+)$/i);
    const noteMatch = lower.match(/^(?:note|quick note|save note|copy)\s*:?\s*(.+)$/i);

    if (noteMatch) {
      const title = noteMatch[1].trim();
      return { intent: 'QUICK_NOTE', title, reply: `Saved note & copied to clipboard: ${title}` };
    }

    if (focusMatch && (lower.includes('focus') || lower.includes('pomodoro') || lower.includes('timer'))) {
      const mins = Math.max(1, Math.min(180, Number(focusMatch[1]) || 25));
      return { intent: 'START_FOCUS', minutes: mins, reply: `Starting a ${mins} minute focus session.` };
    }
    if (expenseMatch) {
      const amount = Number(expenseMatch[1]);
      const merchant = (expenseMatch[2] || '').trim() || undefined;
      return {
        intent: 'LOG_EXPENSE',
        amount,
        category: 'General',
        merchant,
        reply: `Logged ${amount} rupees${merchant ? ` for ${merchant}` : ''}.`,
      };
    }
    if (taskMatch) {
      const title = taskMatch[1].trim();
      return { intent: 'ADD_TASK', title, reply: `Added task: ${title}.` };
    }

    // In-app navigation shortcuts
    if (/^(?:open|show|go to)\s+(habits?|habit tracker)$/i.test(lower)) {
      return { intent: 'NAVIGATE', route: '/habits', reply: 'Opening Habits.' };
    }
    if (/^(?:open|show|go to)\s+(stats|analytics|progress)$/i.test(lower)) {
      return { intent: 'NAVIGATE', route: '/(tabs)/stats', reply: 'Opening your stats.' };
    }
    if (/^(?:open|show|go to)\s+(voice|voice packs|voice settings)$/i.test(lower)) {
      return { intent: 'NAVIGATE', route: '/lifeos/settings/voice-packs', reply: 'Opening Voice Engine settings.' };
    }
    if (/^(?:open|show|go to)\s+(finance|money|expenses)$/i.test(lower)) {
      return { intent: 'NAVIGATE', route: '/lifeos/finance', reply: 'Opening Finance.' };
    }

    const openMatch = lower.match(/^(?:open|launch|start)\s+([a-z0-9\s._-]+)$/i);
    if (openMatch && !lower.includes('focus') && !lower.includes('story')) {
      const appName = openMatch[1].trim();
      return { intent: 'OPEN_APP', appName, reply: `Opening ${appName}.` };
    }
    return null;
  }

  private fallbackRuleIntent(text: string): NinjaVoiceIntent {
    const fast = this.tryFastActionIntent(text);
    if (fast) return fast;
    return {
      intent: 'CHAT',
      reply: `Heard "${text}". Download Qwen2.5 in Offline Voice Packs for full local AI reasoning.`,
    };
  }
}

export const localLlmService = new LocalLlmService();
