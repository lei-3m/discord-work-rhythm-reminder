export const GLOBAL_SETTINGS = {
    enabled: true,
    defaults: {
        team: {
            enabled: true,
            targets: ["team"],
            days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            startDate: "2026-07-06",
            endDate: "2026-09-09",
        },
        personal: {
            enabled: true,
            targets: ["personal"],
            days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sun"],
            startDate: "2026-09-06",
            endDate: null,
        },
    },
};
