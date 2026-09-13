import {GLOBAL_SETTINGS} from "./settings.js";
import {PERSONAL_SCHEDULE} from "./personal.js";
import {TEAM_SCHEDULE} from "./team.js";

export {GLOBAL_SETTINGS, PERSONAL_SCHEDULE, TEAM_SCHEDULE};

export const FILE_SCHEDULE = {
    settings: {enabled: GLOBAL_SETTINGS.enabled},
    channels: {
        team: {...GLOBAL_SETTINGS.channels.team, items: TEAM_SCHEDULE},
        personal: {...GLOBAL_SETTINGS.channels.personal, items: PERSONAL_SCHEDULE},
    },
};

export function normalizeSchedule(data) {
    const list = [];

    for (const [name, channel] of Object.entries(data.channels || {})) {
        const base = {
            enabled: channel.enabled,
            days: channel.days,
            startDate: channel.startDate ?? null,
            endDate: channel.endDate ?? null,
        };

        for (const item of channel.items || []) {
            // channelEnabled is kept separate from the (possibly item-overridden)
            // `enabled` above so the channel's own switch can act as a hard
            // stop regardless of any per-item override (see getScheduledItems).
            list.push({...base, ...item, target: name, channelEnabled: channel.enabled});
        }
    }

    return list;
}
