# 🔧 fixMessage para Vencord

Um plugin de correção gramatical e ortográfica feito sob medida para o **Vencord**, interceptando e corrigindo suas mensagens antes de serem enviadas.

Diferente de ferramentas genéricas, o **fixMessage** possui um motor construído do zero para entender o contexto do **Português Brasileiro** na internet — do "vc" ao "neh", passando por "e" vs "é" com base no pronome anterior.

![License](https://img.shields.io/badge/license-GPL--3.0-blue)
![Status](https://img.shields.io/badge/status-stable-brightgreen)

---

## ✨ Por que usar?

Corretores padrão (LanguageTool, Google Docs, etc.) falham miseravelmente com gírias de Discord e acentuação contextual. Este plugin foi feito por alguém que **cansa de ver mensagem sendo enviada torta** e decidiu resolver na raça.

- **🧠 Motor PT-BR Heurístico (~400 linhas):** Entende a diferença entre `e` (conjunção) e `é` (verbo) baseado no pronome anterior. Corrige `vc` → `você`, `pq` → `porque`, `msm` → `mesmo`, e dezenas de outras abreviações BR. Classifica frases implicitamente — se termina com "né", vira pergunta. Se começa com "nossa", vira exclamação.
- **🔒 Sem vazamento entre canais:** Arquitetura com `Set<channelId>`. Se você ativar a correção no canal A e mudar pro canal B, o plugin **não** vai sobrescrever a mensagem errada. Cada canal tem seu estado isolado.
- **🤖 Suporte a IA com Anti-Injection:** Suporte opcional a OpenAI, Anthropic e APIs custom. As instruções do sistema ficam separadas do texto do usuário (`System`/`User` roles), prevenindo que alguém injete comandos na mensagem pra sequestrar o prompt.
- **⚡ Fallbacks Inteligentes:** Se a API Key falhar ou não estiver configurada, o plugin te avisa com um **Toast** nativo do Vencord e faz fallback automático pro LanguageTool. Você nunca fica sem correção.
- **🇺🇸 Bônus:** Motor experimental pra inglês — contrações (`dont` → `don't`), abreviações de internet (`idk`, `btw`), erros comuns (`teh` → `the`), e pontuação básica.

---

## 🚀 Instalação

### Método 1: Build a partir do fonte (recomendado)

Você precisa ter o **Vencord compilado a partir do fonte** (não funciona com a versão instalada via install.sh + baixada pronta).

```bash
# 1. Entre na pasta de plugins do seu Vencord
cd ~/Vencord/src/plugins/

# 2. Clone o repositório (ou copie a pasta manualmente)
git clone https://github.com/Arthurdevon/fixMessage-vencord.git

# 3. Adicione o plugin ao index
echo "import \"./fixMessage\";" >> src/plugins/index.ts

# 4. Compile o Vencord
cd ~/Vencord
pnpm buildStandalone

# 5. Reinicie o Discord e ative "fixMessage" em:
#    Configurações > Vencord > Plugins > fixMessage
```

**Pronto.** O ícone 🔧 vai aparecer na barra de chat.

### Método 2: Copiar manualmente

Se você já tem o Vencord compilado e só quer adicionar o plugin sem clonar:

```bash
# Copie a pasta fixMessage/ para dentro de src/plugins/
cp -r caminho/para/fixMessage ~/Vencord/src/plugins/fixMessage

# Adicione o import
echo "import \"./fixMessage\";" >> ~/Vencord/src/plugins/index.ts

# Recompile
cd ~/Vencord
pnpm buildStandalone
```

### Método 3: Preview / Devbuild

Se você usa a **versão devbuild** do Vencord (a que se atualiza sozinha), pode carregar o plugin como Custom Plugin:

1. Vá em **Configurações > Vencord > Plugins > Custom Plugins**
2. Adicione a URL: `https://raw.githubusercontent.com/Arthurdevon/fixMessage-vencord/main/fixMessage/index.tsx`
3. Ative o plugin na lista

> ⚠️ Esse método carrega o código-fonte direto do GitHub. Para uso diário, prefira o Método 1.

---

## 🛠️ Configuração

Nas configurações do plugin (Configurações > Vencord > Plugins > fixMessage), você pode escolher:

| Opção | Descrição |
|-------|-----------|
| **Provider** | LanguageTool (grátis, sem chave), OpenAI, Anthropic, ou Custom |
| **API Key** | Sua chave da API (só precisa se for usar OpenAI/Anthropic/Custom) |
| **Model** | Modelo da IA (ex: `gpt-4o-mini`, `claude-3-haiku-20240307`) |
| **Endpoint** | URL customizada (só pro provider Custom) |

**LanguageTool** é o padrão e funciona sem configuração. Rápido e gratuito.

---

## 📖 Como Usar

1. Clique no 🔧 na barra de chat (ativa o "modo correção")
2. Digite sua mensagem naturalmente — sem pontuação, sem acentos, do jeito que veio na cabeça
3. Aperte Enter — o plugin corrige antes de enviar
4. Um Toast verde confirma que funcionou

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

Entrada:  pq vc n vai cmg?
Saída:    Por que você não vai comigo?

Entrada:  e ai blz
Saída:    E aí, beleza?
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

---

## 🧠 Como Funciona

```
[🔧 click] → pendingFixes.add(channelId)
     ↓
[Enter]   → onBeforeMessageSend(channelId, message)
     ↓
[fixText] → LanguageTool API? → parseLTResponse
          → OpenAI/Anthropic?  → makeAIRequest (system/user roles)
          → Sem API Key?       → Toast de aviso + fallback LT
     ↓
[local]   → applyLocalCorrections()  (PT-BR engine)
          → applyEnglishCorrections() (EN engine)
     ↓
[envia]   → message.content = corrected
```

### Fluxo detalhado:

1. **🔧 Botão na ChatBar** — quando clicado, adiciona o `channelId` atual num `Set`. Cada canal tem seu próprio estado, evitando que uma correção ativada no canal A vaze pro canal B.

2. **onBeforeMessageSend** — hook do Vencord que intercepta a mensagem antes dela ser enviada. Checa se o `channelId` está no `Set`. Se sim, remove e processa.

3. **API Layer** — dependendo do provider configurado:
   - **LanguageTool:** requisição HTTP pra api.languagetool.org com retry de 3 tentativas e backoff exponencial. Por que native IPC? Porque o Discord bloqueia fetch() direto via CSP (Content Security Policy). A chamada vai pro processo principal do Electron via `VencordNative`.
   - **OpenAI / Custom:** requisição com `system`/`user` roles separadas pra evitar prompt injection. O prompt do sistema é: *"Fix grammar, spelling, and punctuation. Return ONLY corrected text."*
   - **Anthropic:** mesma lógica, usando o campo nativo `system:` da API Anthropic.
   - **Fallback:** se a API Key não foi configurada mas o provider é OpenAI/Anthropic, mostra um Toast de aviso AMARELO e cai pro LanguageTool automaticamente.

4. **Motor Local** — passa o texto por dois estágios:
   - **PT-BR (`localCorrections.ts`, ~400 linhas):** Mapa de acentos + abreviações BR. Context-check pra verbos ambíguos (ex: "esta" só vira "está" se precedido de pronome). Classificador de sentenças que detecta se é pergunta, exclamação ou afirmação baseado em padrões reais de chat BR. Inclui tratamento de encoding zoado do Discord (unicode misturado tipo "você̂").
   - **EN (`englishCorrections.ts`, ~270 linhas):** Experimental. Spelling, contractions, shorthand, "i" → "I", pontuação básica.

5. **Toast de Confirmação** — mostra qual provider foi usado (LanguageTool, OpenAI, etc.) e se houve alteração.

---

## 📁 Estrutura dos Arquivos

```
fixMessage/
├── index.tsx               ← entrada do plugin (hooks Vencord + orquestração)
├── native.ts               ← ponte pro Electron main process (bypass CSP)
├── localCorrections.ts     ← motor PT-BR (~400 linhas de heurística)
└── englishCorrections.ts   ← motor EN experimental
```

---

## 🔧 Requisitos

- **Vencord** compilado a partir do fonte (ou devbuild com suporte a custom plugins)
- **Discord desktop** (não funciona no web)
- **Node.js** >= 18 (pra compilar)
- **pnpm** (pra compilar)

---

## 🤝 Contribuindo

Quer adicionar um novo idioma? Crie um arquivo tipo `spanishCorrections.ts` seguindo o mesmo padrão do `englishCorrections.ts`:

1. Word maps (palavras comuns do idioma)
2. Sentence classification (pergunta/exclamação/afirmação)
3. Import e encadeamento no `index.tsx`

PRs são bem-vindos!

---

## 📜 Licença

GPL-3.0 — mesma do Vencord.

---

*Feito com ódio aos erros de digitação e amor ao código por [Arthurdevon](https://github.com/Arthurdevon).* 🔧
