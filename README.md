# fixMessage ✨

A Vencord plugin that auto-corrects Portuguese (PT-BR) grammar and spelling using LanguageTool API + a local fallback.

Click the ✨ button, then send your message — it corrects before it goes out.

## Features

- **LanguageTool API** — catches real grammar issues (agreement, verb tense, etc.)
- **Local fallback** — catches common accent and spelling mistakes the free LT API misses
- **Sentence-level punctuation** — splits compound sentences, adds ?, !, or . automatically
- **Works offline** — local corrections always apply, API is just a bonus

## Installation

1. **Clone this repo** into your Vencord `src/plugins/` directory:
   ```bash
   cd ~/Vencord/src/plugins/
   git clone https://github.com/Arthurdevon/fixMessage-vencord.git
   ```

2. **Enable the plugin** in your `src/plugins/index.ts` (add to the imports):
   ```ts
   import "./fixMessage";
   ```

3. **Rebuild Vencord**:
   ```bash
   pnpm buildStandalone
   ```

4. **Restart Discord** and enable "fixMessage" in Vencord settings.

## Usage

1. Click the ✨ button in the chat bar (it activates "correction mode")
2. Type your message normally — no punctuation, no accents, just raw
3. Hit Enter — the plugin corrects it before sending
4. A toast notification confirms it worked

### Example

```
Input:  ola tudo bem como voce esta
Output: Olá, tudo bem? Como você está?

Input:  nossa que legal vc conseguiu parabens
Output: Nossa, que legal! Você conseguiu! Parabéns!

Input:  sim eu quero sim obrigado
Output: Sim, eu quero sim. Obrigado!
```

## How it works

1. **LanguageTool API** — sends text to the free LT v2 API with 3 retry attempts
2. **Native bridge** — API calls go through Electron's main process (CSP in the renderer blocks fetch)
3. **Local corrections** — ~100 accent mappings + sentence splitting + punctuation classification
4. **Vencord hook** — uses `onBeforeMessageSend` to intercept and replace the message content

## Requirements

- Vencord (standalone or desktop build)
- Discord desktop client (not web)

## License

GPL-3.0 (same as Vencord)
