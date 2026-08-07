export const GLOBAL_SETTINGS = {
    enabled: true,
    defaultPeriod: {
        startDate: "2026-07-06",
        endDate: "2026-08-14",
    },
};

export const SCHEDULE = [
    {
        name: "출근 알림",
        enabled: true,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        time: "09:00",
        message:
            "🌞 **좋은 아침입니다!**\n" +
            "오늘도 화이팅! 💪\n\n" +
            "📋 스크럼\n" +
            "{{NOTION_URL}}",
    },
    {
        name: "오전 첫 쉬는시간",
        enabled: true,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        time: "09:48",
        message: "☕ **쉬는시간이에요!**\n잠깐 자리에서 일어나 몸을 풀고, 물도 한 잔 마셔요.",
    },
    {
        name: "오전 두 번째 쉬는시간",
        enabled: true,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        time: "10:48",
        message: "☕ **쉬는시간이에요!**\n잠깐 자리에서 일어나 몸을 풀고, 물도 한 잔 마셔요.",
    },
    {
        name: "점심시간",
        enabled: true,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        time: "11:48",
        message: "🍱 **점심시간이에요!**\n하던 일을 잠깐 멈추고 맛있게 식사해요.",
    },
    {
        name: "점심 종료 10분 전",
        enabled: true,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        time: "12:50",
        message: "⏰ **10분 뒤 점심시간이 끝나요!**\n천천히 오후 업무를 시작할 준비를 해요.",
    },
    {
        name: "오후 1시 쉬는시간",
        enabled: true,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        time: "13:48",
        message: "☕ **쉬는시간이에요!**\n잠깐 자리에서 일어나 몸을 풀고, 물도 한 잔 마셔요.",
    },
    {
        name: "오후 2시 쉬는시간",
        enabled: true,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        time: "14:48",
        message: "☕ **쉬는시간이에요!**\n잠깐 자리에서 일어나 몸을 풀고, 물도 한 잔 마셔요.",
    },
    {
        name: "오후 3시 쉬는시간",
        enabled: true,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        time: "15:48",
        message: "☕ **쉬는시간이에요!**\n잠깐 자리에서 일어나 몸을 풀고, 물도 한 잔 마셔요.",
    },
    {
        name: "오후 4시 쉬는시간",
        enabled: true,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        time: "16:48",
        message: "☕ **쉬는시간이에요!**\n잠깐 자리에서 일어나 몸을 풀고, 물도 한 잔 마셔요.",
    },
    {
        name: "퇴근 알림",
        enabled: true,
        days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        time: "18:00",
        message: "🎉 **퇴근시간입니다!**\n오늘도 고생 많으셨어요. 내일도 화이팅! 😊",
    },
];
