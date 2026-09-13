import {FILE_SCHEDULE, normalizeSchedule} from "./schedule/index.js";
import {ADMIN_UI_HTML} from "./adminUi.js";
import {ICONS} from "./icons.js";

const APP_NAME = "업무 리듬";
const APP_THEME_COLOR = "#1F7A6D";

const WEB_MANIFEST = JSON.stringify({
    name: APP_NAME,
    short_name: APP_NAME,
    start_url: "/",
    display: "standalone",
    // Matches the icon's own accent background — otherwise the OS splash
    // screen shows the clock glyph floating on a mismatched gray/white canvas.
    background_color: APP_THEME_COLOR,
    theme_color: APP_THEME_COLOR,
    // icon-512.png is listed twice on purpose: the glyph already respects the
    // maskable safe zone (center 80%), so the same file serves both purposes
    // instead of shipping a near-duplicate asset.
    icons: [
        {src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any"},
        {src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any"},
        {src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable"},
    ],
});

const KV_KEY = "schedule";
const KV_BACKUP_KEY = "schedule.backup";
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const VALID_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: {"Content-Type": "application/json"},
    });
}

// ---- new (channel) structure validation ----

function validateRepeat(repeat, where) {
    if (!repeat || typeof repeat !== "object") {
        return `${where} must be an object.`;
    }
    if (typeof repeat.startTime !== "string" || !TIME_RE.test(repeat.startTime)) {
        return `${where}.startTime must be in HH:MM format.`;
    }
    if (typeof repeat.endTime !== "string" || !TIME_RE.test(repeat.endTime)) {
        return `${where}.endTime must be in HH:MM format.`;
    }
    if (repeat.startTime >= repeat.endTime) {
        return `${where}.startTime must be earlier than endTime.`;
    }
    if (!Number.isInteger(repeat.everyMinutes) || repeat.everyMinutes <= 0) {
        return `${where}.everyMinutes must be a positive integer.`;
    }

    return null;
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
        if (item.repeat !== undefined && item.time !== undefined) {
            return `${where} must not have both .time and .repeat — they are mutually exclusive.`;
        }
        if (item.repeat !== undefined) {
            const reason = validateRepeat(item.repeat, `${where}.repeat`);
            if (reason) return reason;
        } else if (typeof item.time !== "string" || !TIME_RE.test(item.time)) {
            return `${where}.time must be in HH:MM format, or provide ${where}.repeat instead.`;
        }
        if (typeof item.message !== "string" || !item.message) {
            return `${where}.message is required and must be a string.`;
        }
        if (item.enabled !== undefined && typeof item.enabled !== "boolean") {
            return `${where}.enabled must be a boolean.`;
        }
        if (item.days !== undefined) {
            if (!Array.isArray(item.days) || !item.days.every((d) => VALID_DAYS.includes(d))) {
                return `${where}.days must be an array using only ${VALID_DAYS.join("/")}.`;
            }
        }
        if (item.startDate !== undefined && item.startDate !== null && typeof item.startDate !== "string") {
            return `${where}.startDate must be a string or null.`;
        }
        if (item.endDate !== undefined && item.endDate !== null && typeof item.endDate !== "string") {
            return `${where}.endDate must be a string or null.`;
        }
    }

    return null;
}

function validateChannel(channel, label) {
    if (!channel || typeof channel !== "object" || Array.isArray(channel)) {
        return `${label} must be an object.`;
    }
    if (typeof channel.enabled !== "boolean") {
        return `${label}.enabled must be a boolean.`;
    }
    if (!Array.isArray(channel.days) || !channel.days.every((d) => VALID_DAYS.includes(d))) {
        return `${label}.days must be an array using only ${VALID_DAYS.join("/")}.`;
    }
    if (channel.startDate !== undefined && channel.startDate !== null && typeof channel.startDate !== "string") {
        return `${label}.startDate must be a string or null.`;
    }
    if (channel.endDate !== undefined && channel.endDate !== null && typeof channel.endDate !== "string") {
        return `${label}.endDate must be a string or null.`;
    }

    return validateScheduleItems(channel.items, `${label}.items`);
}

function validateScheduleData(data) {
    if (!data || typeof data !== "object") {
        return "Body must be a JSON object.";
    }
    if (!data.settings || typeof data.settings !== "object") {
        return "settings is required and must be an object.";
    }
    if (typeof data.settings.enabled !== "boolean") {
        return "settings.enabled must be a boolean.";
    }
    if (
        data.settings.channelOrder !== undefined &&
        (!Array.isArray(data.settings.channelOrder) ||
            !data.settings.channelOrder.every((c) => typeof c === "string"))
    ) {
        return "settings.channelOrder must be an array of strings.";
    }
    if (!data.channels || typeof data.channels !== "object" || Array.isArray(data.channels)) {
        return "channels is required and must be an object.";
    }

    const names = Object.keys(data.channels);

    if (names.length === 0) {
        return "channels must contain at least one channel.";
    }

    for (const name of names) {
        const reason = validateChannel(data.channels[name], `channels.${name}`);
        if (reason) return reason;
    }

    return null;
}

function isNewScheduleData(data) {
    return Boolean(data && typeof data === "object" && data.channels);
}

// ---- legacy (team/personal + targets) structure support ----
// Kept only so notifications don't break before /admin/migrate is run.

function isLegacyScheduleData(data) {
    return Boolean(
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

function withLegacyDefaults(items, defaults) {
    return items.map((item) => ({...defaults, ...item}));
}

function normalizeLegacySchedule(data) {
    const combined = [
        ...withLegacyDefaults(data.team || [], data.settings.defaults.team),
        ...withLegacyDefaults(data.personal || [], data.settings.defaults.personal),
    ];

    return combined.flatMap((entry) => {
        const targets = Array.isArray(entry.targets) ? entry.targets : [];

        return targets.map((target) => ({
            target,
            enabled: entry.enabled,
            days: entry.days,
            startDate: entry.startDate,
            endDate: entry.endDate,
            time: entry.time,
            name: entry.name,
            message: entry.message,
        }));
    });
}

function migrateLegacyToChannels(data) {
    const channels = {};
    const groups = [
        {items: data.team || [], defaults: data.settings.defaults.team || {}},
        {items: data.personal || [], defaults: data.settings.defaults.personal || {}},
    ];

    for (const {items, defaults} of groups) {
        const channelNames = Array.isArray(defaults.targets) && defaults.targets.length
            ? defaults.targets
            : ["default"];

        for (const channelName of channelNames) {
            if (!channels[channelName]) {
                channels[channelName] = {
                    enabled: defaults.enabled ?? true,
                    days: defaults.days || [],
                    startDate: defaults.startDate ?? null,
                    endDate: defaults.endDate ?? null,
                    items: [],
                };
            }

            for (const item of items) {
                const {targets, ...rest} = item;
                channels[channelName].items.push(rest);
            }
        }
    }

    return {
        settings: {enabled: data.settings.enabled},
        channels,
    };
}

// ---- schedule loading (KV first, file fallback) ----

async function loadScheduleData(env) {
    try {
        if (!env.SCHEDULE_KV) throw new Error("SCHEDULE_KV binding missing");

        const data = await env.SCHEDULE_KV.get(KV_KEY, "json");

        if (!data) {
            console.log("[schedule] KV 비어있음 → 파일 폴백 사용");
        } else if (isNewScheduleData(data) && validateScheduleData(data) === null) {
            console.log("[schedule] KV(채널 구조)에서 일정 로드");
            return {settings: data.settings, schedule: normalizeSchedule(data)};
        } else if (isLegacyScheduleData(data)) {
            console.log("[schedule] KV(구 구조)에서 일정 로드 — /admin/migrate 실행 권장");
            return {settings: data.settings, schedule: normalizeLegacySchedule(data)};
        } else {
            console.log("[schedule] KV 데이터 형식 오류 → 파일 폴백 사용");
        }
    } catch (err) {
        console.error("[schedule] KV 읽기 실패 → 파일 폴백 사용:", err);
    }

    return {settings: FILE_SCHEDULE.settings, schedule: normalizeSchedule(FILE_SCHEDULE)};
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

function timeToMinutes(hhmm) {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
}

function matchesTime(entry, nowTime) {
    if (entry.repeat) {
        const {startTime, endTime, everyMinutes} = entry.repeat;
        const nowMin = timeToMinutes(nowTime);
        const startMin = timeToMinutes(startTime);
        const endMin = timeToMinutes(endTime);

        if (nowMin < startMin || nowMin > endMin) return false;

        return (nowMin - startMin) % everyMinutes === 0;
    }

    return entry.time === nowTime;
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
            matchesTime(entry, now.time) &&
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

function timingSafeEqual(a, b) {
    if (a.length !== b.length) return false;

    let diff = 0;

    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return diff === 0;
}

const PROTECTED_ROUTES = [
    {pathname: "/api/schedule", method: "GET"},
    {pathname: "/api/schedule", method: "PUT"},
    {pathname: "/admin/init", method: "POST"},
    {pathname: "/admin/migrate", method: "POST"},
    {pathname: "/test", method: "GET"},
];

function isAuthorized(url, env) {
    if (!env.ADMIN_TOKEN) return false;

    const key = url.searchParams.get("key") || "";

    return timingSafeEqual(key, env.ADMIN_TOKEN);
}

export default {
    async scheduled(controller, env, ctx) {
        const data = await loadScheduleData(env);
        const items = getScheduledItems(data, new Date(controller.scheduledTime));

        for (const item of items) {
            ctx.waitUntil(sendToAll(env, item.message, [item.target]));
        }
    },

    async fetch(request, env) {
        const url = new URL(request.url);

        const requiresAuth = PROTECTED_ROUTES.some(
            (route) => route.pathname === url.pathname && route.method === request.method
        );

        if (requiresAuth && !isAuthorized(url, env)) {
            return jsonResponse({error: "unauthorized"}, 401);
        }

        if (url.pathname === "/" && request.method === "GET") {
            return new Response(ADMIN_UI_HTML, {
                headers: {"Content-Type": "text/html; charset=utf-8"},
            });
        }

        if (url.pathname === "/manifest.json" && request.method === "GET") {
            return new Response(WEB_MANIFEST, {
                headers: {"Content-Type": "application/manifest+json; charset=utf-8"},
            });
        }

        if (ICONS[url.pathname.slice(1)] && request.method === "GET") {
            const png = Uint8Array.from(atob(ICONS[url.pathname.slice(1)]), (c) => c.charCodeAt(0));
            return new Response(png, {
                headers: {
                    "Content-Type": "image/png",
                    "Cache-Control": "public, max-age=604800",
                },
            });
        }

        if (url.pathname === "/test") {
            await sendToAll(
                env,
                "✅️ **테스트 알림입니다!**\nCloudflare 연결이 정상이에요."
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

            await env.SCHEDULE_KV.put(KV_KEY, JSON.stringify(FILE_SCHEDULE));

            return new Response("Schedule initialized in KV.");
        }

        if (url.pathname === "/admin/migrate" && request.method === "POST") {
            if (!env.SCHEDULE_KV) {
                return jsonResponse({error: "SCHEDULE_KV binding missing."}, 500);
            }

            const existing = await env.SCHEDULE_KV.get(KV_KEY, "json");

            if (!existing) {
                return jsonResponse({error: "KV has no schedule data to migrate."}, 409);
            }

            if (isNewScheduleData(existing)) {
                return jsonResponse({error: "Schedule is already in the channel structure."}, 409);
            }

            if (!isLegacyScheduleData(existing)) {
                return jsonResponse(
                    {error: "Existing KV data is not in a recognized legacy structure."},
                    400
                );
            }

            await env.SCHEDULE_KV.put(KV_BACKUP_KEY, JSON.stringify(existing));

            const migrated = migrateLegacyToChannels(existing);

            await env.SCHEDULE_KV.put(KV_KEY, JSON.stringify(migrated));

            return jsonResponse({ok: true, channels: Object.keys(migrated.channels)});
        }

        if (url.pathname === "/api/channels" && request.method === "GET") {
            try {
                const webhooks = parseWebhookUrls(env.DISCORD_WEBHOOK_URLS);
                return jsonResponse(Object.keys(webhooks));
            } catch (err) {
                return jsonResponse({error: err.message}, 500);
            }
        }

        if (url.pathname === "/api/schedule" && request.method === "GET") {
            if (!env.SCHEDULE_KV) {
                return jsonResponse({error: "SCHEDULE_KV binding missing."}, 500);
            }

            const data = await env.SCHEDULE_KV.get(KV_KEY, "json");

            if (data) {
                return jsonResponse(data);
            }

            return jsonResponse(FILE_SCHEDULE);
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
