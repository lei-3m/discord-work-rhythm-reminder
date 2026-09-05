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
* 🔤 환경 변수 기반 메시지 치환(`{{NOTION_URL}}`)
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
│   └── schedule/
│       ├── index.js      # 일정 통합 및 re-export
│       ├── settings.js   # GLOBAL_SETTINGS
│       ├── team.js       # 팀 알림 일정
│       └── personal.js   # 개인 알림 일정
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

예시(JSON 객체 — 채널 이름을 키로 사용)

```json
{
  "personal": "https://discord.com/api/webhooks/...",
  "team": "https://discord.com/api/webhooks/..."
}
```

키 이름은 일정의 `targets`에서 사용합니다. 아래 JSON 배열 형식도 계속 동작하며, 이 경우 모든 웹훅으로 전송됩니다.

```json
[
  "https://discord.com/api/webhooks/...",
  "https://discord.com/api/webhooks/..."
]
```

### 4. 메시지 환경 변수 등록

메시지 안의 링크처럼 저장소에 남기고 싶지 않은 값은 환경 변수로 관리합니다.

```bash
npx wrangler secret put NOTION_URL
```

기본 일정 중 **출근 알림**이 `{{NOTION_URL}}`을 사용하므로, 등록하지 않으면 메시지에 `{{NOTION_URL}}` 문자열이 그대로 전송됩니다.

| 변수                     | 필수 | 설정 위치            | 설명                                    |
|------------------------|----|------------------|---------------------------------------|
| `DISCORD_WEBHOOK_URLS` | ✅  | 시크릿              | 채널 이름별 Discord Webhook URL의 JSON 객체 (배열도 허용) |
| `NOTION_URL`           | ✅  | 시크릿              | 출근 알림에 첨부되는 스크럼 노션 문서 주소              |
| `WEBHOOK_NAME`         | ⬜  | `wrangler.jsonc` | Discord에 표시될 발신자 이름 (기본값: `쉬는시간 알리미`) |

### 5. 배포

```bash
npm run deploy
```

## 🔤 메시지 템플릿

메시지 안의 `{{변수명}}`은 전송 직전에 같은 이름의 환경 변수 값으로 치환됩니다.

```javascript
{
  name: "출근 알림",
  message: "📋 스크럼\n{{NOTION_URL}}",
}
```

새로운 값을 쓰려면 메시지에 `{{MY_LINK}}`처럼 적고 시크릿을 등록하면 됩니다.

```bash
npx wrangler secret put MY_LINK
```

해당 이름의 환경 변수가 없으면 치환되지 않고 `{{MY_LINK}}`가 그대로 남습니다.

## ⚙️ 일정 설정

알림은 `src/schedule/` 폴더에서 관리합니다. 팀 알림은 `team.js`, 개인 알림은 `personal.js`, 전역 설정은 `settings.js`에 있고 `index.js`가 이를 합쳐 `SCHEDULE`로 내보냅니다.

그룹별 기본값은 `settings.js`의 `GLOBAL_SETTINGS.defaults`에 모여 있고, `index.js`가 이를 `withDefaults(items, defaults)`로 주입합니다. 각 일정은 달라지는 값만 적고, 항목에 있는 값이 기본값보다 우선합니다.

| 그룹                  | 기본값                |
|---------------------|--------------------|
| `TEAM_SCHEDULE`     | `defaults.team`     |
| `PERSONAL_SCHEDULE` | `defaults.personal` |

```javascript
export const GLOBAL_SETTINGS = {
  enabled: true, // false면 개별 enabled 값과 무관하게 모든 알림 중단
  defaults: {
    team: {
      enabled: true,
      targets: ["team"],
      days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      startDate: "2026-07-06",
      endDate: "2026-09-05",
    },
    personal: {
      enabled: true,
      targets: ["personal"],
      days: ["Sat", "Sun"],
      startDate: null, // null이면 기간 제한 없음
      endDate: null,
    },
  },
};
```

기본 형태 — 이름, 시각, 메시지만 적습니다.

```javascript
{
  name: "출근 알림",
  time: "09:00",
  message: "🌞 좋은 아침입니다!"
}
```

기본값과 다르게 동작해야 하는 일정에만 해당 필드를 직접 적습니다.

```javascript
{
  name: "신입 온보딩 안내",
  endDate: "2026-07-17", // startDate는 defaults.team 값을 그대로 사용
  days: ["Mon"],
  time: "10:00",
  message: "📗 온보딩 문서를 확인해주세요!"
}
```

**우선순위:** 항목에 쓴 값 > 그룹 기본값. `startDate`와 `endDate`는 각각 따로 판정되므로, 위 예시처럼 `endDate`만 덮어쓰면 `startDate`는 그룹 기본값을 따릅니다. 기간을 무제한으로 두려면 해당 값을 `null`로 둡니다.

### 채널별 선택 전송

`targets`에 `DISCORD_WEBHOOK_URLS` 객체의 키를 적으면 해당 웹훅으로만 전송합니다. 생략하면 등록된 모든 웹훅으로 전송합니다.

```javascript
{
  name: "팀 스크럼 안내",
  enabled: true,
  targets: ["team"], // 생략 시 전체 전송
  days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  time: "09:00",
  message: "📋 스크럼 시작합니다!"
}
```

`targets`에 없는 이름을 적으면 그 이름만 건너뛰고 `console.error`로 경고를 남깁니다. 같은 시각에 여러 일정이 있으면 모두 각자의 `targets`로 전송됩니다.

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
