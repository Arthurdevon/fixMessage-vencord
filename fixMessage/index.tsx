/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin, { PluginNative } from "@utils/types";
import { ChatBarButton } from "@api/ChatButtons";
import { showToast, Toasts } from "@webpack/common";
import { applyLocalCorrections } from "./localCorrections";
import { applyEnglishCorrections } from "./englishCorrections";

// Bridge to main process (CSP blocks fetch from renderer)
const Native = VencordNative.pluginHelpers.fixMessage as PluginNative<typeof import("./native")>;

// Only runs when the ✨ button was clicked
let fixNext = false;

interface LTMatch {
    message: string;
    offset: number;
    length: number;
    replacements: { value: string }[];
}

interface LTResponse {
    matches: LTMatch[];
}

async function fixText(text: string, lang: string = "pt-BR"): Promise<{ text: string; usedApi: boolean }> {
    let apiResult: string | null = null;

    try {
        const { status, data } = await Native.makeLTRequest(text, lang);

        if (status === 200) {
            const parsed: LTResponse = JSON.parse(data);
            let result = text;
            const sorted = [...parsed.matches]
                .filter(m => m.replacements.length > 0)
                .sort((a, b) => b.offset - a.offset);

            for (const match of sorted) {
                const best = match.replacements[0].value;
                result = result.slice(0, match.offset) + best + result.slice(match.offset + match.length);
            }

            apiResult = result;
        } else {
            console.warn("[fixMessage] LanguageTool error:", status, data);
        }
    } catch (e) {
        console.warn("[fixMessage] fetch failed, using local only:", e);
    }

    const baseText = apiResult ?? text;
    const ptFixed = applyLocalCorrections(baseText);
    const corrected = applyEnglishCorrections(ptFixed);

    return {
        text: corrected,
        usedApi: apiResult !== null,
    };
}

// Wrench icon 🔧
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
    description: "Corrige gramática e ortografia com LanguageTool + corretor local PT-BR. Ativa com botão ✨, depois envia a mensagem.",
    authors: [
        { name: "Arthurdevon", id: 1072644260140163212n }
    ],
    tags: ["Chat", "Utility"],

    chatBarButton: {
        icon: FixIcon,
        render: () => (
            <ChatBarButton
                tooltip="Corrigir mensagem ✨"
                onClick={() => {
                    fixNext = true;
                    showToast("✨ Modo correção ativado! Envia a mensagem pra corrigir.", Toasts.Type.SUCCESS);
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
                    showToast("✨ Tudo certo! Nada pra corrigir.", Toasts.Type.SUCCESS);
                    return;
                }

                message.content = fixed;
                if (usedApi) {
                    showToast("✨ Mensagem corrigida!", Toasts.Type.SUCCESS);
                } else {
                    showToast("✨ Corrigido (modo local — API indisponível)", Toasts.Type.SUCCESS);
                }
            } catch (e) {
                console.error("[fixMessage]", e);
                const errMsg = e instanceof Error ? e.message : "erro desconhecido";
                showToast("Erro ao corrigir: " + errMsg, Toasts.Type.FAILURE);
            }
        })();
    },
});
