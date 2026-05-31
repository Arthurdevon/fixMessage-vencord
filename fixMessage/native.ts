/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

export async function makeLTRequest(_: IpcMainInvokeEvent, text: string, lang: string) {
    const url = "https://api.languagetool.org/v2/check";

    // 3 attempts with exponential backoff (free api flakes sometimes)
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                    text,
                    language: lang,
                    enabledOnly: "false",
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
