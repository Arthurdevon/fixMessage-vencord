# fixMessage ✨

A Vencord plugin that auto-corrects grammar and spelling using LanguageTool API + local fallback.

Currently supports **Portuguese (PT-BR)** and **English** (experimental).
More languages coming soon.

Click the ✨ button, then send your message — it corrects before it goes out.

## Features

- **LanguageTool API** — catches real grammar issues (agreement, verb tense, etc.)
- **Local correction engine** — catches common accent and spelling mistakes the free LT API misses
- **Multi-language** — PT-BR (primary) and English (experimental). Language detection is automatic.
- **Sentence-level punctuation** — splits compound sentences, adds ?, !, or . based on context
- **Works offline** — local corrections always apply, API is just a bonus

## Supported Languages

| Language | Status | What it handles |
|---|---|---|
| 🇧🇷 Portuguese (PT-BR) | ✅ Stable | Accents (vc→você, nao→não), greetings (ola, blz), commas after interjections, sentence classification, question/exclamation detection |
| 🇺🇸 English | 🧪 Experimental | Common typos (teh→the, recieve→receive), contractions (dont→don't, youre→you're), internet shorthand (idk, btw), "i"→"I", basic punctuation |
| 🌍 More languages | 🔜 Coming | Spanish, French, German, Italian — contributions welcome! |

## Installation

1. **Clone this repo** into your Vencord `src/plugins/` directory:
   ```bash
   cd ~/Vencord/src/plugins/
   git clone https://github.com/Arthurdevon/fixMessage-vencord.git
   ```

2. **Enable the plugin** by adding to your `src/plugins/index.ts`:
   ```ts
   import "./fixMessage";
   ```

3. **Rebuild Vencord**:
   ```bash
   pnpm buildStandalone
   ```

4. **Restart Discord** and enable "fixMessage" in Vencord settings > Plugins.

## Usage

1. Click the ✨ button in the chat bar (activates "correction mode")
2. Type your message naturally — no punctuation, no accents, just raw
3. Hit Enter — the plugin corrects it before sending
4. Toast notification confirms it worked

### Portuguese Examples

```
Input:  ola tudo bem como voce esta
Output: Olá, tudo bem? Como você está?

Input:  nossa que legal vc conseguiu parabens
Output: Nossa, que legal! Você conseguiu! Parabéns!

Input:  sim eu quero sim obrigado
Output: Sim, eu quero sim. Obrigado!

Input:  amanhã vou comecar academia
Output: Amanhã vou começar academia.
```

### English Examples

```
Input:  hey how r u
Output: Hey, how are you?

Input:  thats so cool i didnt know
Output: That's so cool! I didn't know.

Input:  btw idk what u mean
Output: By the way, I don't know what you mean.

Input:  teh reciept was definately wrong
Output: The receipt was definitely wrong.
```

## How it works

1. **LanguageTool API** — sends text to the free LT v2 API with 3 retry attempts
2. **Native bridge** — API calls go through Electron's main process (CSP in the renderer blocks fetch directly)
3. **Local correction engine** — language-specific word maps + sentence splitting + punctuation classification
4. **Vencord hook** — uses `onBeforeMessageSend` to intercept and replace the message content

## File Structure

```
fixMessage/
├── index.tsx               ← plugin entry (Vencord hooks + API orchestration)
├── native.ts               ← Electron main process bridge (bypasses CSP)
├── localCorrections.ts     ← PT-BR correction engine
└── englishCorrections.ts   ← English correction engine (experimental)
```

## Contributing

Adding a new language? Create a file like `spanishCorrections.ts` following the same pattern as `englishCorrections.ts` — word maps + sentence classification. PRs welcome!

## Requirements

- Vencord (standalone or desktop build)
- Discord desktop client (not web)

## License

GPL-3.0 (same as Vencord)
