/**
 * Offline Indic-to-Latin Phonetic Transliterator & Bilingual Intent Normalizer.
 * Zero-download, zero-network helper so code-mixed speech (e.g. "open whatsapp"
 * transcribed by Tamil/Hindi STT as "ஓபன் வாட்ஸ்அப்" or "ओपन व्हाट्सएप")
 * maps cleanly to NeuroNinja actions and app names.
 */

const TAMIL_CONSONANTS: Record<string, string> = {
  'க': 'k', 'ங': 'ng', 'ச': 'ch', 'ஞ': 'nj', 'ட': 't', 'ண': 'n',
  'த': 'th', 'ந': 'n', 'ன': 'n', 'ப': 'p', 'ம': 'm', 'ய': 'y',
  'ர': 'r', 'ற': 'r', 'ல': 'l', 'ள': 'l', 'ழ': 'zh', 'வ': 'v',
  'ஜ': 'j', 'ஷ': 'sh', 'ஸ': 's', 'ஹ': 'h',
};

const TAMIL_VOWELS: Record<string, string> = {
  'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo',
  'எ': 'e', 'ஏ': 'ae', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oo', 'ஔ': 'au',
};

const TAMIL_MATRAS: Record<string, string> = {
  'ா': 'aa', 'ி': 'i', 'ீ': 'ee', 'ு': 'u', 'ூ': 'oo',
  'ெ': 'e', 'ே': 'ae', 'ை': 'ai', 'ொ': 'o', 'ோ': 'oo', 'ௌ': 'au',
  '்': '',
};

const DEVANAGARI_CONSONANTS: Record<string, string> = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'च': 'ch', 'छ': 'chh',
  'ज': 'j', 'झ': 'jh', 'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh',
  'ण': 'n', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y',
  'र': 'r', 'ल': 'l', 'व': 'v', 'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
};

const DEVANAGARI_VOWELS: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au',
};

const DEVANAGARI_MATRAS: Record<string, string> = {
  'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', '्': '', 'ं': 'n', 'ँ': 'n',
};

const PHONETIC_APP_ALIASES: [RegExp, string][] = [
  [/vaatsap|vaatshap|vatsap|whatsapp/gi, 'whatsapp'],
  [/yootyoob|yootup|youtube/gi, 'youtube'],
  [/instakraam|instagiraam|instagram/gi, 'instagram'],
  [/kuroom|kroom|chrome/gi, 'chrome'],
  [/kyaamaraa|kaemara|camera/gi, 'camera'],
  [/spaatipai|spotify/gi, 'spotify'],
  [/thelekiraam|teligraam|telegram/gi, 'telegram'],
  [/jiyomeil|jimeil|gmail/gi, 'gmail'],
  [/myaaps|maaps|maps/gi, 'maps'],
  [/kaalendar|calendar/gi, 'calendar'],
  [/setings|chettings|settings/gi, 'settings'],
  [/kaalkyooletar|calculator/gi, 'calculator'],
];

const BILINGUAL_ACTION_REPLACEMENTS: [RegExp, string][] = [
  // Open / Launch (Tamil + Hindi + transliterated)
  [/(?:திற|திறக்கவும்|ஓபன்\s*பண்ணு|ஓபன்|ओपन|खोलो|खोलें|opan|thira|kholo)/gi, 'open'],
  // Focus / Pomodoro
  [/(?:போகஸ்|கவனம்|फोकस|ध्यान|pokas|phokas)/gi, 'focus'],
  [/(?:நிமிடம்|நிமிஷம்|मिनट|minit|nimisham|nimidam)/gi, 'minutes'],
  // Expense / Rupees
  [/(?:ரூபாய்|ரூபா|रुपये|रुपए|roobaai|rupaye|selavu|kharch)/gi, 'rupees'],
  [/(?:செலவு|खर्च|லॉग|எழுது|लिखो)/gi, 'log'],
  // Task / Todo
  [/(?:டாஸ்க்|வேலை|टास्क|काम|நினைவூட்டு|याद दिलाओ)/gi, 'add task'],
  // App sections
  [/(?:ஹாபிட்ஸ்|பழக்கங்கள்|आदतें)/gi, 'habits'],
  [/(?:ஸ்டாட்ஸ்|புள்ளிவிவரம்|आंकड़े)/gi, 'stats'],
  [/(?:பைனான்ஸ்|பணம்|पैसे)/gi, 'finance'],
];

export function transliterateIndicToLatin(input: string): string {
  const chars = Array.from(input);
  let out = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];

    if (TAMIL_CONSONANTS[ch]) {
      out += TAMIL_CONSONANTS[ch];
      if (next && TAMIL_MATRAS[next] !== undefined) {
        out += TAMIL_MATRAS[next];
        i++;
      } else {
        out += 'a';
      }
      continue;
    }
    if (TAMIL_VOWELS[ch]) {
      out += TAMIL_VOWELS[ch];
      continue;
    }
    if (DEVANAGARI_CONSONANTS[ch]) {
      out += DEVANAGARI_CONSONANTS[ch];
      if (next && DEVANAGARI_MATRAS[next] !== undefined) {
        out += DEVANAGARI_MATRAS[next];
        i++;
      } else {
        out += 'a';
      }
      continue;
    }
    if (DEVANAGARI_VOWELS[ch]) {
      out += DEVANAGARI_VOWELS[ch];
      continue;
    }
    out += ch;
  }

  return out;
}

/**
 * Normalizes English, Tanglish, Hinglish, Tamil, or Hindi STT text into
 * canonical English intent phrasing while preserving numbers & entity names.
 */
export function normalizeForIntent(rawText: string): string {
  let text = rawText.trim();
  if (!text) return '';

  for (const [pattern, replacement] of BILINGUAL_ACTION_REPLACEMENTS) {
    text = text.replace(pattern, ` ${replacement} `);
  }

  text = transliterateIndicToLatin(text);

  for (const [pattern, canonical] of PHONETIC_APP_ALIASES) {
    text = text.replace(pattern, canonical);
  }

  // Handle Tamil/Hindi SOV word order: "whatsapp open" -> "open whatsapp"
  const sovOpen = text.trim().match(/^([a-z0-9._-]+)\s+open$/i);
  if (sovOpen) {
    return `open ${sovOpen[1]}`;
  }

  return text.replace(/\s+/g, ' ').trim();
}

export function hasIndicScript(text: string): boolean {
  return /[\u0900-\u0D7F]/.test(text);
}
