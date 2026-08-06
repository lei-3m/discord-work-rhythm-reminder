<p align="center">
  <img src="https://github.com/user-attachments/assets/09febae6-d3f0-49c6-a6d5-4757de0a172d"
       alt="image"
       width="550">
</p>

# Discord Work Rhythm Reminder

Cloudflare Workers를 이용해 **Discord로 업무 리듬 알림을 자동 전송**하는 서버리스 프로젝트입니다.

출근, 쉬는시간, 점심시간, 스크럼, 퇴근 등 반복되는 업무 일정을 Discord 채널로 자동 안내합니다.

## ✨ 주요 기능

* 🌞 출근 알림
* ☕ 쉬는시간 알림
* 🍱 점심시간 알림
* ⏰ 점심 종료 안내
* 📋 스크럼 링크 안내
* 🎉 퇴근 알림
* 📅 요일별 실행
* 📆 기간(Start/End Date) 설정
* ✅ 알림별 ON/OFF
* 📢 여러 Discord Webhook 동시 전송
* 🧪 테스트 메시지 전송(`/test`)

## 🛠 Tech Stack

* JavaScript (ES Modules)
* Cloudflare Workers
* Cloudflare Cron Triggers
* Discord Webhook

## 📁 프로젝트 구조

```text
.
├── src/
│   ├── index.js          # Worker 진입점
│   ├── schedule.js       # 알림 일정 및 메시지
│   └── ...
├── package.json
├── wrangler.jsonc
└── README.md
```

## 🚀 실행 방법

### 1. 설치

```bash
npm install
```

### 2. Cloudflare 로그인

```bash
npx wrangler login
```

### 3. Discord Webhook 등록

```bash
npx wrangler secret put DISCORD_WEBHOOK_URLS
```

예시(JSON 배열)

```json
[
  "https://discord.com/api/webhooks/...",
  "https://discord.com/api/webhooks/..."
]
```

### 4. 배포

```bash
npm run deploy
```

## ⚙️ 일정 설정

알림은 `schedule.js`에서 관리합니다.

예시

```javascript
{
  name: "Morning",
  enabled: true,
  startDate: "2026-07-06",
  endDate: "2026-07-31",
  days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  time: "09:00",
  message: "🌞 좋은 아침입니다!"
}
```

전체 알림을 한 번에 끄려면 `schedule.js`의 전역 설정을 변경합니다.

```javascript
export const GLOBAL_SETTINGS = {
  enabled: false, // 개별 enabled 값과 무관하게 모든 알림 중단
};
```

수정 후에는 다시 배포합니다.

```bash
npm run deploy
```

## 🧪 테스트

배포된 Worker 주소 뒤에 `/test`를 붙이면 테스트 메시지를 전송합니다.

```text
https://<worker>.workers.dev/test
```

## 📌 향후 계획

* 알림 그룹별 ON/OFF
* 채널별 선택 전송
* Notion API 연동
* 공휴일 자동 제외
* 웹 기반 설정 화면

## 💡 개발 배경

장시간 원격 근무 중 쉬는시간과 점심시간을 자주 놓치는 경험에서 시작한 프로젝트입니다.

로컬 프로그램 대신 Cloudflare Workers를 사용하여 **컴퓨터가 꺼져 있어도** 알림이 계속 동작하도록 구현했습니다.

또한 일정별 활성화, 기간 제한, 다중 Discord 채널 전송 등을 지원해 개인 및 팀 프로젝트에서 함께 사용할 수 있도록 설계했습니다.

## License

MIT
