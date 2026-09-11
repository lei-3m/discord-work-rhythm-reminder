import {GLOBAL_SETTINGS, SCHEDULE} from "./schedule/index.js";

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

function getScheduledItems(date = new Date()) {
    if (!GLOBAL_SETTINGS.enabled) {
        return [];
    }

    const now = getKoreanNow(date);

    return SCHEDULE.filter(
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
        const items = getScheduledItems(new Date(controller.scheduledTime));
        // console.log(`[cron] ${new Date(controller.scheduledTime).toISOString()} items=${items.length}`);

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

        return new Response("Discord break reminder is running.");
    },
};
