# fixMessage ✨

Plugin Vencord que corrige gramática e ortografia automaticamente usando a API LanguageTool + corretor local.

Atualmente suporta **Português (PT-BR)** e **Inglês** (experimental).
Mais idiomas em breve.

Clique no ✨, depois envie a mensagem — o plugin corrige antes dela ser enviada.

## Funcionalidades

- **API LanguageTool** — pega erros reais de gramática (concordância, tempo verbal, etc.)
- **Corretor local** — pega acentos e erros comuns que a API gratuita do LT não detecta
- **Multi-idioma** — PT-BR (principal) e Inglês (experimental). Detecção automática.
- **Pontuação inteligente** — divide frases compostas, adiciona ?, ! ou . baseado no contexto
- **Funciona offline** — correções locais sempre aplicam, API é um bônus

## Idiomas Suportados

| Idioma | Status | O que faz |
|---|---|---|
| 🇧🇷 Português (PT-BR) | ✅ Estável | Acentos (vc→você, nao→não), saudações (ola, blz), vírgulas pós-interjeição, classificação de frase, detecção de pergunta/exclamação |
| 🇺🇸 Inglês | 🧪 Experimental | Erros comuns (teh→the, recieve→receive), contrações (dont→don't, youre→you're), abreviações (idk, btw), "i"→"I", pontuação básica |
| 🌍 Mais idiomas | 🔜 Em breve | Espanhol, Francês, Alemão, Italiano — contribuições bem-vindas! |

## Instalação

1. **Clone este repositório** dentro de `src/plugins/` do seu Vencord:
   ```bash
   cd ~/Vencord/src/plugins/
   git clone https://github.com/Arthurdevon/fixMessage-vencord.git
   ```

2. **Ative o plugin** adicionando no seu `src/plugins/index.ts`:
   ```ts
   import "./fixMessage";
   ```

3. **Recompile o Vencord**:
   ```bash
   pnpm buildStandalone
   ```

4. **Reinicie o Discord** e ative "fixMessage" em Settings > Plugins.

## Como Usar

1. Clique no ✨ na barra de chat (ativa o "modo correção")
2. Digite sua mensagem naturalmente — sem pontuação, sem acentos, do jeito que veio na cabeça
3. Aperte Enter — o plugin corrige antes de enviar
4. Uma notificação toast confirma que funcionou

### Exemplos em Português

```
Entrada:  ola tudo bem como voce esta
Saída:    Olá, tudo bem? Como você está?

Entrada:  nossa que legal vc conseguiu parabens
Saída:    Nossa, que legal! Você conseguiu! Parabéns!

Entrada:  sim eu quero sim obrigado
Saída:    Sim, eu quero sim. Obrigado!

Entrada:  amanhã vou comecar academia
Saída:    Amanhã vou começar academia.
```

### Exemplos em Inglês

```
Entrada:  hey how r u
Saída:    Hey, how are you?

Entrada:  thats so cool i didnt know
Saída:    That's so cool! I didn't know.

Entrada:  btw idk what u mean
Saída:    By the way, I don't know what you mean.

Entrada:  teh reciept was definately wrong
Saída:    The receipt was definitely wrong.
```

## Como Funciona

1. **API LanguageTool** — envia o texto pra API gratuita v2 com 3 tentativas de retry
2. **Ponte nativa** — as chamadas API passam pelo processo principal do Electron (CSP no renderer bloqueia fetch direto)
3. **Corretor local** — mapas de palavras por idioma + divisão de frases + classificação de pontuação
4. **Hook Vencord** — usa `onBeforeMessageSend` pra interceptar e substituir o conteúdo da mensagem

## Estrutura dos Arquivos

```
fixMessage/
├── index.tsx               ← entrada do plugin (hooks Vencord + orquestração da API)
├── native.ts               ← ponte pro processo principal do Electron (bypass CSP)
├── localCorrections.ts     ← motor de correção PT-BR
└── englishCorrections.ts   ← motor de correção Inglês (experimental)
```

## Contribuindo

Quer adicionar um novo idioma? Crie um arquivo tipo `spanishCorrections.ts` seguindo o mesmo padrão do `englishCorrections.ts` — mapas de palavras + classificação de frases. PRs são bem-vindos!

## Requisitos

- Vencord (standalone ou desktop build)
- Cliente desktop do Discord (não funciona na web)

## Licença

GPL-3.0 (mesma do Vencord)
