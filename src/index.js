import {
    GLOBAL_SETTINGS as FILE_SETTINGS,
    TEAM_SCHEDULE as FILE_TEAM,
    PERSONAL_SCHEDULE as FILE_PERSONAL,
    buildSchedule,
} from "./schedule/index.js";

const KV_KEY = "schedule";

function isValidScheduleData(data) {
    return (
        data &&
        typeof data === "object" &&
        data.settings &&
        data.settings.defaults &&
        data.settings.defaults.team &&
        data.settings.defaults.personal &&
        Array.isArray(data.team) &&
        Array.isArray(data.personal)
    );
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const VALID_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {"Content-Type": "application/json"},
    });
}

function validateScheduleItems(items, label) {
    if (!Array.isArray(items)) {
        return `${label} must be an array.`;
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const where = `${label}[${i}]`;

        if (!item || typeof item !== "object") {
            return `${where} must be an object.`;
        }
        if (typeof item.name !== "string" || !item.name) {
            return `${where}.name is required and must be a string.`;
        }
        if (typeof item.time !== "string" || !TIME_RE.test(item.time)) {
            return `${where}.time must be in HH:MM format.`;
        }
        if (typeof item.message !== "string" || !item.message) {
            return `${where}.message is required and must be a string.`;
        }
        if (item.days !== undefined) {
            if (!Array.isArray(item.days) || !item.days.every((d) => VALID_DAYS.includes(d))) {
                return `${where}.days must be an array using only ${VALID_DAYS.join("/")}.`;
            }
        }
        if (item.targets !== undefined) {
            if (
                !Array.isArray(item.targets) ||
                !item.targets.every((t) => typeof t === "string")
            ) {
                return `${where}.targets must be an array of strings.`;
            }
        }
    }

    return null;
}

function validateScheduleData(data) {
    if (!data || typeof data !== "object") {
        return "Body must be a JSON object.";
    }
    if (!data.settings || typeof data.settings !== "object") {
        return "settings is required and must be an object.";
    }
    if (!Array.isArray(data.team)) {
        return "team is required and must be an array.";
    }
    if (!Array.isArray(data.personal)) {
        return "personal is required and must be an array.";
    }

    return (
        validateScheduleItems(data.team, "team") ||
        validateScheduleItems(data.personal, "personal") ||
        null
    );
}

async function loadScheduleData(env) {
    try {
        if (!env.SCHEDULE_KV) throw new Error("SCHEDULE_KV binding missing");

        const data = await env.SCHEDULE_KV.get(KV_KEY, "json");

        if (!data) {
            console.log("[schedule] KV 비어있음 → 파일 폴백 사용");
        } else if (!isValidScheduleData(data)) {
            console.log("[schedule] KV 데이터 형식 오류 → 파일 폴백 사용");
        } else {
            console.log("[schedule] KV에서 일정 로드");
            return {
                settings: data.settings,
                schedule: buildSchedule(data.settings, data.team, data.personal),
            };
        }
    } catch (err) {
        console.error("[schedule] KV 읽기 실패 → 파일 폴백 사용:", err);
    }

    return {
        settings: FILE_SETTINGS,
        schedule: buildSchedule(FILE_SETTINGS, FILE_TEAM, FILE_PERSONAL),
    };
}

function getKoreanNow(date = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        weekday: "short",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(date);

    const values = Object.fromEntries(
        parts.map(({type, value}) => [type, value])
    );

    return {
        weekday: values.weekday,
        date: `${values.year}-${values.month}-${values.day}`,
        time: `${values.hour}:${values.minute}`,
    };
}

function isWithinDateRange(date, startDate, endDate) {
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    return true;
}

function getScheduledItems({settings, schedule}, date = new Date()) {
    if (!settings.enabled) {
        return [];
    }

    const now = getKoreanNow(date);

    return schedule.filter(
        (entry) =>
            entry.enabled === true &&
            entry.days.includes(now.weekday) &&
            entry.time === now.time &&
            isWithinDateRange(now.date, entry.startDate, entry.endDate)
    );
}

function parseWebhookUrls(raw) {
    if (!raw) throw new Error("DISCORD_WEBHOOK_URLS secret is missing.");

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
            throw new Error("DISCORD_WEBHOOK_URLS must be a non-empty JSON array.");
        }

        return Object.fromEntries(
            parsed.map((url, index) => [String(index), url])
        );
    }

    if (parsed && typeof parsed === "object") {
        if (Object.keys(parsed).length === 0) {
            throw new Error("DISCORD_WEBHOOK_URLS must be a non-empty JSON object.");
        }

        return parsed;
    }

    throw new Error("DISCORD_WEBHOOK_URLS must be a JSON object or array.");
}

function selectWebhooks(webhooks, targets) {
    if (!Array.isArray(targets) || targets.length === 0) {
        return Object.values(webhooks);
    }

    const selected = [];

    for (const target of targets) {
        const url = webhooks[target];

        if (!url) {
            console.error(`Unknown webhook target: "${target}"`);
            continue;
        }

        selected.push(url);
    }

    return selected;
}

async function sendWebhook(url, content, username) {
    const response = await fetch(url, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            content,
            username,
            allowed_mentions: {parse: ["everyone", "roles", "users"]},
        }),
    });

    if (!response.ok) {
        throw new Error(
            `Discord webhook failed: ${response.status} ${await response.text()}`
        );
    }
}

function renderMessage(template, env) {
    return template.replace(
        /\{\{(\w+)\}\}/g,
        (match, key) => env[key] ?? match
    );
}

async function sendToAll(env, message, targets) {
    const webhooks = parseWebhookUrls(env.DISCORD_WEBHOOK_URLS);
    const urls = selectWebhooks(webhooks, targets);

    if (urls.length === 0) {
        console.error("No matching webhook target. Nothing sent.");
        return;
    }

    const username = env.WEBHOOK_NAME || "쉬는시간 알리미";
    const content = renderMessage(message, env);

    const results = await Promise.allSettled(
        urls.map((url) => sendWebhook(url, content, username))
    );

    const failed = results.filter((result) => result.status === "rejected");
    failed.forEach((result) => console.error(result.reason));

    if (failed.length) {
        throw new Error(`${failed.length} webhook(s) failed.`);
    }

    console.log(`Sent to ${urls.length} webhook(s).`);
}

export default {
    async scheduled(controller, env, ctx) {
        const data = await loadScheduleData(env);
        const items = getScheduledItems(data, new Date(controller.scheduledTime));

        for (const item of items) {
            ctx.waitUntil(sendToAll(env, item.message, item.targets));
        }
    },

    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === "/test") {
            await sendToAll(
                env,
                "✅ **테스트 알림입니다!**\nCloudflare 연결이 정상이에요."
            );
            return new Response("Test message sent.");
        }

        if (url.pathname === "/admin/init" && request.method === "POST") {
            if (!env.SCHEDULE_KV) {
                return new Response("SCHEDULE_KV binding missing.", {status: 500});
            }

            const existing = await env.SCHEDULE_KV.get(KV_KEY);

            if (existing !== null) {
                return new Response(
                    "KV already has schedule data. Refusing to overwrite.",
                    {status: 409}
                );
            }

            const payload = {
                settings: FILE_SETTINGS,
                team: FILE_TEAM,
                personal: FILE_PERSONAL,
            };

            await env.SCHEDULE_KV.put(KV_KEY, JSON.stringify(payload));

            return new Response("Schedule initialized in KV.");
        }

        if (url.pathname === "/api/schedule" && request.method === "GET") {
            if (!env.SCHEDULE_KV) {
                return jsonResponse({error: "SCHEDULE_KV binding missing."}, 500);
            }

            const data = await env.SCHEDULE_KV.get(KV_KEY, "json");

            if (data) {
                return jsonResponse(data);
            }

            return jsonResponse({
                settings: FILE_SETTINGS,
                team: FILE_TEAM,
                personal: FILE_PERSONAL,
            });
        }

        if (url.pathname === "/api/schedule" && request.method === "PUT") {
            if (!env.SCHEDULE_KV) {
                return jsonResponse({error: "SCHEDULE_KV binding missing."}, 500);
            }

            let data;

            try {
                data = await request.json();
            } catch {
                return jsonResponse({error: "Body must be valid JSON."}, 400);
            }

            const reason = validateScheduleData(data);

            if (reason) {
                return jsonResponse({error: reason}, 400);
            }

            await env.SCHEDULE_KV.put(KV_KEY, JSON.stringify(data));

            return jsonResponse({ok: true});
        }

        return new Response("Discord break reminder is running.");
    },
};
