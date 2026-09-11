import {GLOBAL_SETTINGS} from "./settings.js";
import {PERSONAL_SCHEDULE} from "./personal.js";
import {TEAM_SCHEDULE} from "./team.js";

export {GLOBAL_SETTINGS, PERSONAL_SCHEDULE, TEAM_SCHEDULE};

function withDefaults(items, defaults) {
    return items.map((item) => ({...defaults, ...item}));
}

export function buildSchedule(settings, team, personal) {
    return [
        ...withDefaults(team, settings.defaults.team),
        ...withDefaults(personal, settings.defaults.personal),
    ];
}

export const SCHEDULE = buildSchedule(GLOBAL_SETTINGS, TEAM_SCHEDULE, PERSONAL_SCHEDULE);
