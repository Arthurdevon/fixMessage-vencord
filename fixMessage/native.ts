/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

const SYSTEM_PROMPT = "You are a text formatter. Fix the grammar, spelling, and punctuation of the input text. Return ONLY the corrected text, no explanations, no quotes, no labels.";

export async function makeLTRequest(_: IpcMainInvokeEvent, text: string, lang: string) {
    const url = "https://api.languagetool.org/v2/check";

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({ text, language: lang, enabledOnly: "false" }),
            });
            const data = await res.text();
            return { status: res.status, data };
        } catch (e) {
            if (attempt < 2) {
                await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
                continue;
            }
            return { status: -1, data: String(e) };
        }
    }
    return { status: -1, data: "unreachable" };
}

export async function makeAIRequest(
    _: IpcMainInvokeEvent,
    text: string,
    apiKey: string,
    endpoint: string,
    model: string,
) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: model || "gpt-4o-mini",
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        { role: "user", content: text },
                    ],
                }),
            });
            const data = await res.text();
            return { status: res.status, data };
        } catch (e) {
            if (attempt < 2) {
                await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
                continue;
            }
            return { status: -1, data: String(e) };
        }
    }
    return { status: -1, data: "unreachable" };
}

export async function makeAnthropicRequest(
    _: IpcMainInvokeEvent,
    text: string,
    apiKey: string,
    endpoint: string,
    model: string,
) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                },
                body: JSON.stringify({
                    model: model || "claude-3-haiku-20240307",
                    max_tokens: 1024,
                    system: SYSTEM_PROMPT,
                    messages: [
                        { role: "user", content: text },
                    ],
                }),
            });
            const data = await res.text();
            return { status: res.status, data };
        } catch (e) {
            if (attempt < 2) {
                await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
                continue;
            }
            return { status: -1, data: String(e) };
        }
    }
    return { status: -1, data: "unreachable" };
}
