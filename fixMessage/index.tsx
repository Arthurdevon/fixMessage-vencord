/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { SelectedChannelStore, showToast, Toasts } from "@webpack/common";

import { applyEnglishCorrections } from "./englishCorrections";
import { applyLocalCorrections } from "./localCorrections";

// Bridge to main process (CSP blocks fetch from renderer)
const Native = VencordNative.pluginHelpers.fixMessage as PluginNative<typeof import("./native")>;

// Track which channels are waiting for a correction — one per click, scoped
// so switching channels doesn't accidentally fix a message in the wrong one
const pendingFixes = new Set<string>();

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
        // Apply replacements from end to start so offsets don't shift
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

function parseAIResponse(data: string): string | null {
    try {
        const parsed = JSON.parse(data);
        // OpenAI / Custom format
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

async function fixText(text: string): Promise<{ text: string; usedApi: boolean }> {
    const { provider } = settings.store;
    const apiKey = settings.store.apiKey?.trim();
    const model = settings.store.model?.trim();
    const endpoint = settings.store.endpoint?.trim();

    let apiResult: string | null = null;

    if (provider === "languagetool") {
        // LanguageTool is free and needs no key
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
    } else if (!apiKey) {
        // User picked OpenAI/Anthropic/Custom but didn't configure the key
        showToast("No API key configured — falling back to LanguageTool", Toasts.Type.WARNING);
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
        // OpenAI or Custom (both use the same chat completions format)
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

const FixIcon = () => (
    <svg viewBox="0 0 24 24" height={20} width={20}>
        <path
            fill="currentColor"
            d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
        />
    </svg>
);

export default definePlugin({
    name: "fixMessage",
    description: "Fix grammar and spelling with LanguageTool, OpenAI, Anthropic, or a custom API, plus local PT-BR/EN corrections. Click the wrench icon then send your message.",
    authors: [Devs.Arthurdevon],
    tags: ["Chat", "Utility"],

    settings,

    chatBarButton: {
        icon: FixIcon,
        render: () => (
            <ChatBarButton
                tooltip="Fix message"
                onClick={() => {
                    const channelId = SelectedChannelStore.getChannelId();
                    if (channelId) {
                        pendingFixes.add(channelId);
                        showToast("Fix activated! Send your message to correct it.", Toasts.Type.SUCCESS);
                    }
                }}
            >
                <FixIcon />
            </ChatBarButton>
        ),
    },

    onBeforeMessageSend(channelId, message) {
        if (!pendingFixes.has(channelId)) return;
        pendingFixes.delete(channelId);

        const text = message.content?.trim();
        if (!text) return;

        return (async (): Promise<void | { cancel: boolean }> => {
            try {
                const { text: fixed, usedApi } = await fixText(text);
                if (fixed === text) {
                    showToast("Nothing to fix!", Toasts.Type.SUCCESS);
                    return;
                }

                message.content = fixed;
                const label = settings.store.provider === "languagetool" ? "LanguageTool" : settings.store.provider;
                showToast(`Fixed with ${label}`, Toasts.Type.SUCCESS);
            } catch (e) {
                console.error("[fixMessage]", e);
                showToast("Failed to fix: " + (e instanceof Error ? e.message : "unknown error"), Toasts.Type.FAILURE);
            }
        })();
    },
});
