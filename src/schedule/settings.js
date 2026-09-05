export const GLOBAL_SETTINGS = {
    enabled: true,
    defaults: {
        team: {
            enabled: true,
            targets: ["team"],
            days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
            startDate: "2026-07-06",
            endDate: "2026-10-03",
        },
        personal: {
            enabled: true,
            targets: ["personal"],
            days: ["Sat", "Sun"],
            startDate: null,
            endDate: null,
        },
    },
};
