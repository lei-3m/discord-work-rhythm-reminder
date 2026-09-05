import {GLOBAL_SETTINGS} from "./settings.js";
import {PERSONAL_SCHEDULE} from "./personal.js";
import {TEAM_SCHEDULE} from "./team.js";

export {GLOBAL_SETTINGS};

function withDefaults(items, defaults) {
    return items.map((item) => ({...defaults, ...item}));
}

export const SCHEDULE = [
    ...withDefaults(TEAM_SCHEDULE, GLOBAL_SETTINGS.defaults.team),
    ...withDefaults(PERSONAL_SCHEDULE, GLOBAL_SETTINGS.defaults.personal),
];
