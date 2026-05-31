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

// Star icon ✨
const FixIcon = () => (
    <svg viewBox="0 0 24 24" height={20} width={20}>
        <path
            fill="currentColor"
            d="M12 2l1.5 6.5L20 9l-5 4.5L16 21l-4-3.5L8 21l1-7.5L4 9l6.5-.5z"
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
