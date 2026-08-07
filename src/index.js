import {GLOBAL_SETTINGS, SCHEDULE} from "./schedule.js";

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

function getScheduledMessage(date = new Date()) {
    if (!GLOBAL_SETTINGS.enabled) {
        return null;
    }

    const now = getKoreanNow(date);

    const item = SCHEDULE.find(
        (entry) =>
            entry.enabled === true &&
            entry.days.includes(now.weekday) &&
            entry.time === now.time &&
            isWithinDateRange(
                now.date,
                entry.startDate ?? GLOBAL_SETTINGS.defaultPeriod?.startDate,
                entry.endDate ?? GLOBAL_SETTINGS.defaultPeriod?.endDate
            )
    );

    return item?.message ?? null;
}

function parseWebhookUrls(raw) {
    if (!raw) throw new Error("DISCORD_WEBHOOK_URLS secret is missing.");

    const urls = JSON.parse(raw);

    if (!Array.isArray(urls) || urls.length === 0) {
        throw new Error("DISCORD_WEBHOOK_URLS must be a non-empty JSON array.");
    }

    return urls;
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

async function sendToAll(env, message) {
    const urls = parseWebhookUrls(env.DISCORD_WEBHOOK_URLS);
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
        const message = getScheduledMessage(
            new Date(controller.scheduledTime)
        );

        if (message) {
            ctx.waitUntil(sendToAll(env, message));
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
