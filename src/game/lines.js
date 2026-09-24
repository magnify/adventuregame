import { save } from './save.js';

/**
 * Every line a character says, in simple English and Danish, from docs/script.md. Bubbles take a line id.
 * The language is chosen on the start card, remembered, and can be forced with ?lang=da or ?lang=en.
 */
export const LINES = {
  // the street
  'whats-that': { en: "What's that?", da: 'Hvad er det?' },
  locked: { en: "It's locked.", da: 'Den er låst.' },
  'where-key': { en: 'Where is the key?', da: 'Hvor er nøglen?' },
  'have-key': { en: 'I have a key!', da: 'Jeg har en nøgle!' },
  'a-key': { en: 'A key!', da: 'En nøgle!' },
  wow: { en: 'Wow!', da: 'Wow!' },
  miaow: { en: 'Miaow.', da: 'Miav.' },
  no: { en: 'Hmm, no.', da: 'Hmm, nej.' },
  // the meadow
  'where-am-i': { en: 'Where am I?', da: 'Hvor er jeg?' },
  'three-suns': { en: 'Three suns!', da: 'Tre sole!' },
  'barlin-hello': { en: "Hello! I'm Barlin.", da: 'Goddag! Jeg hedder Barlin.' },
  'come-with-me': { en: 'Come with me!', da: 'Kom med mig!' },
  'bug-hello': { en: 'Hello!', da: 'Hej!' },
  'bug-hi': { en: 'Hi hi!', da: 'Hej hej!' },
  'that-way': { en: 'That way!', da: 'Den vej!' },
  'big-stone': { en: 'A big stone.', da: 'En stor sten.' },
  // the forest
  'getting-dark': { en: "It's getting dark.", da: 'Det bliver mørkt.' },
  'narrow-path': { en: 'The narrow path.', da: 'Den smalle sti.' },
  'cant-see': { en: "I can't see!", da: 'Jeg kan ikke se noget!' },
  'follow-lights': { en: 'Follow the lights!', da: 'Følg lysene!' },
  'just-a-rock': { en: 'Just a rock.', da: 'Bare en sten.' },
  // the swamp
  stuck: { en: "I'm stuck!", da: 'Jeg sidder fast!' },
  'help-barlin': { en: 'Help, Barlin!', da: 'Hjælp, Barlin!' },
  'little-magic': { en: 'I know a little magic.', da: 'Jeg kan lidt magi.' },
  'hold-on': { en: 'Hold on!', da: 'Hold fast!' },
  'thanks-barlin': { en: 'Thank you, Barlin!', da: 'Tak, Barlin!' },
  'my-stick': { en: 'My stick.', da: 'Min pind.' },
  'a-stick': { en: 'A little stick.', da: 'En lille pind.' },
  'cant-reach': { en: "I can't reach it.", da: 'Jeg kan ikke nå den.' },
  ribbit: { en: 'Ribbit!', da: 'Kvæk!' },
  'witch-house': { en: "Whose house is that?", da: 'Hvis hus er det?' },
  'dont-eat': { en: "Don't eat anything.", da: 'Spis ikke noget.' },
  // words with no speaker
  title: { en: 'The Door in the Tree', da: 'Døren i træet' },
  tagline: { en: 'Tap things, solve puzzles.', da: 'Tryk på ting, løs gåder.' },
  loading: { en: 'Cutting out the street…', da: 'Klipper gaden ud…' },
  'witch-title': { en: "The witch's house", da: 'Heksens hus' },
  'witch-end': { en: "That's as far as the story goes tonight.", da: 'Længere er historien ikke nået i aften.' },
  'back-to-street': { en: 'Back to the street', da: 'Tilbage til gaden' },
};

const pick = () => {
  const q = new URLSearchParams(location.search).get('lang'); if (q === 'da' || q === 'en') return q;
  const saved = save.get('lang'); if (saved) return saved;
  return /^da\b/i.test(navigator.language || '') ? 'da' : 'en';
};
let lang = pick();
export const language = { get: () => lang, set: l => { lang = l; save.set('lang', l); } };
/** The words for a line id in the current language; an unknown id comes back as itself, so a typo shows. */
export const L = id => LINES[id]?.[lang] ?? LINES[id]?.en ?? id;
