/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { ChatBarButton } from "@api/ChatButtons";
import { showToast, Toasts } from "@webpack/common";
import { applyLocalCorrections } from "./localCorrections";
import { applyEnglishCorrections } from "./englishCorrections";

// Bridge to main process (CSP blocks fetch from renderer)
const Native = VencordNative.pluginHelpers.fixMessage as PluginNative<typeof import("./native")>;

let fixNext = false;

// ─── SETTINGS ───

const settings = definePluginSettings({
    provider: {
        type: OptionType.SELECT,
        description: "API provider for corrections",
        options: [
            { label: "LanguageTool (free)", value: "languagetool", default: true },
            { label: "OpenAI", value: "openai" },
            { label: "Anthropic", value: "anthropic" },
            { label: "Custom (OpenAI-compatible)", value: "custom" },
        ],
    },
    apiKey: {
        type: OptionType.STRING,
        description: "API key (for OpenAI, Anthropic, or Custom). Leave blank to use LanguageTool.",
        default: "",
        placeholder: "sk-...",
    },
    model: {
        type: OptionType.STRING,
        description: "Model name (for AI providers). Defaults: gpt-4o-mini (OpenAI) or claude-3-haiku (Anthropic)",
        default: "",
        placeholder: "gpt-4o-mini, claude-3-haiku, etc.",
    },
    endpoint: {
        type: OptionType.STRING,
        description: "Custom API endpoint (only for Custom provider). Must be an OpenAI-compatible chat completions URL.",
        default: "",
        placeholder: "https://api.openai.com/v1/chat/completions",
    },
});

// ─── LANGUAGE TOOL PARSING ───

interface LTMatch {
    message: string;
    offset: number;
    length: number;
    replacements: { value: string }[];
}

interface LTResponse {
    matches: LTMatch[];
}

function parseLTResponse(text: string, data: string): string | null {
    try {
        const parsed: LTResponse = JSON.parse(data);
        let result = text;
        const sorted = [...parsed.matches]
            .filter(m => m.replacements.length > 0)
            .sort((a, b) => b.offset - a.offset);

        for (const match of sorted) {
            const best = match.replacements[0].value;
            result = result.slice(0, match.offset) + best + result.slice(match.offset + match.length);
        }
        return result;
    } catch {
        return null;
    }
}

// ─── AI RESPONSE PARSING ───

function parseAIResponse(data: string): string | null {
    try {
        const parsed = JSON.parse(data);
        // OpenAI format
        if (parsed.choices?.[0]?.message?.content) {
            return parsed.choices[0].message.content.trim();
        }
        // Anthropic format
        if (parsed.content?.[0]?.text) {
            return parsed.content[0].text.trim();
        }
        return null;
    } catch {
        return null;
    }
}

// ─── FIX ENGINE ───

async function fixText(text: string): Promise<{ text: string; usedApi: boolean }> {
    const provider = settings.store.provider;
    const apiKey = settings.store.apiKey?.trim();
    const model = settings.store.model?.trim();
    const endpoint = settings.store.endpoint?.trim();

    let apiResult: string | null = null;

    if (provider === "languagetool" || !apiKey) {
        // LanguageTool free (or no key configured)
        try {
            const { status, data } = await Native.makeLTRequest(text, "pt-BR");
            if (status === 200) {
                apiResult = parseLTResponse(text, data);
            } else {
                console.warn("[fixMessage] LanguageTool error:", status, data);
            }
        } catch (e) {
            console.warn("[fixMessage] LT fetch failed:", e);
        }
    } else if (provider === "anthropic") {
        try {
            const ep = endpoint || "https://api.anthropic.com/v1/messages";
            const m = model || "claude-3-haiku-20240307";
            const { status, data } = await Native.makeAnthropicRequest(text, apiKey, ep, m);
            if (status === 200) {
                apiResult = parseAIResponse(data);
            } else {
                console.warn("[fixMessage] Anthropic error:", status, data);
            }
        } catch (e) {
            console.warn("[fixMessage] Anthropic fetch failed:", e);
        }
    } else {
        // OpenAI or Custom (both use OpenAI-compatible format)
        try {
            const ep = provider === "custom"
                ? endpoint
                : "https://api.openai.com/v1/chat/completions";
            if (!ep) {
                console.warn("[fixMessage] No endpoint configured for custom provider");
            } else {
                const m = model || "gpt-4o-mini";
                const { status, data } = await Native.makeAIRequest(text, apiKey, ep, m);
                if (status === 200) {
                    apiResult = parseAIResponse(data);
                } else {
                    console.warn("[fixMessage] OpenAI/Custom error:", status, data);
                }
            }
        } catch (e) {
            console.warn("[fixMessage] AI fetch failed:", e);
        }
    }

    const baseText = apiResult ?? text;
    const ptFixed = applyLocalCorrections(baseText);
    const corrected = applyEnglishCorrections(ptFixed);

    return { text: corrected, usedApi: apiResult !== null };
}

// ─── ICON ───

// Wrench icon 🔧
const FixIcon = () => (
    <svg viewBox="0 0 24 24" height={20} width={20}>
        <path
            fill="currentColor"
            d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        />
    </svg>
);

// ─── PLUGIN ───

export default definePlugin({
    name: "fixMessage",
    description: "Corrige gramática e ortografia com LanguageTool, OpenAI, Anthropic ou API customizada + corretor local PT-BR/EN. Ativa com botão 🔧, depois envia a mensagem.",
    authors: [{ name: "Arthurdevon", id: 1072644260140163212n }],
    tags: ["Chat", "Utility"],

    settings,

    chatBarButton: {
        icon: FixIcon,
        render: () => (
            <ChatBarButton
                tooltip="Corrigir mensagem 🔧"
                onClick={() => {
                    fixNext = true;
                    showToast("🔧 Correção ativada! Envia a mensagem pra corrigir.", Toasts.Type.SUCCESS);
                }}
            >
                <FixIcon />
            </ChatBarButton>
        ),
    },

    onBeforeMessageSend(_, message) {
        if (!fixNext) return;
        fixNext = false;

        const text = message.content?.trim();
        if (!text) return;

        return (async (): Promise<void | { cancel: boolean }> => {
            try {
                const { text: fixed, usedApi } = await fixText(text);
                if (fixed === text) {
                    showToast("🔧 Tudo certo! Nada pra corrigir.", Toasts.Type.SUCCESS);
                    return;
                }

                message.content = fixed;
                const label = settings.store.provider === "languagetool" ? "LanguageTool" : settings.store.provider;
                showToast(`🔧 Corrigido (${label})`, Toasts.Type.SUCCESS);
            } catch (e) {
                console.error("[fixMessage]", e);
                showToast("🔧 Erro ao corrigir: " + (e instanceof Error ? e.message : "erro desconhecido"), Toasts.Type.FAILURE);
            }
        })();
    },
});
