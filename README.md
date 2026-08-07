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

### 4. 메시지 환경 변수 등록

메시지 안의 링크처럼 저장소에 남기고 싶지 않은 값은 환경 변수로 관리합니다.

```bash
npx wrangler secret put NOTION_URL
```

기본 일정 중 **출근 알림**이 `{{NOTION_URL}}`을 사용하므로, 등록하지 않으면 메시지에 `{{NOTION_URL}}` 문자열이 그대로 전송됩니다.

| 변수                     | 필수 | 설정 위치            | 설명                                    |
|------------------------|----|------------------|---------------------------------------|
| `DISCORD_WEBHOOK_URLS` | ✅  | 시크릿              | 전송할 Discord Webhook URL의 JSON 배열      |
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

알림은 `schedule.js`에서 관리합니다.

알림 기간은 `GLOBAL_SETTINGS.defaultPeriod`에서 한 번만 정하고, 각 일정은 날짜를 생략해 이 값을 물려받습니다.

```javascript
export const GLOBAL_SETTINGS = {
  enabled: true, // false면 개별 enabled 값과 무관하게 모든 알림 중단
  defaultPeriod: {
    startDate: "2026-07-06",
    endDate: "2026-08-15",
  },
};
```

기본 형태 — 날짜 없이 씁니다.

```javascript
{
  name: "출근 알림",
  enabled: true,
  days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  time: "09:00",
  message: "🌞 좋은 아침입니다!"
}
```

기본 기간과 다르게 동작해야 하는 예외 일정에만 날짜를 직접 적습니다.

```javascript
{
  name: "신입 온보딩 안내",
  enabled: true,
  endDate: "2026-07-17", // startDate는 defaultPeriod 값을 그대로 사용
  days: ["Mon"],
  time: "10:00",
  message: "📗 온보딩 문서를 확인해주세요!"
}
```

**우선순위:** `startDate`와 `endDate`는 각각 따로 판정되며, 일정에 값이 있으면 그 값을, 없으면 `defaultPeriod`의 값을 사용합니다.

즉 위 예시처럼 `endDate`만 덮어쓰면 `startDate`는 여전히 `defaultPeriod`를 따릅니다. `null`을 넣어도 폴백이 적용되므로, 특정 일정만 기간 제한 없이 돌리려면 `defaultPeriod` 자체를 비워야 합니다.

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
