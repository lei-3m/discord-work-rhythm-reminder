# Discord 인턴 쉬는시간 알리미

## 켜기 / 끄기

`src/schedule.js`에서:

```js
enabled: true,
```

를

```js
enabled: false,
```

로 바꾸면 해당 알림만 꺼집니다.

## 전체 기간 변경

각 알림의 아래 날짜를 바꿉니다.

```js
startDate: "2026-07-06",
endDate: "2026-07-31",
```

예를 들어 8월 14일까지 연장하려면:

```js
endDate: "2026-08-14",
```

## 시간 변경

```js
time: "15:48",
```

형식은 24시간제 `HH:MM`입니다.

## 반영 방법

수정 후 프로젝트 폴더에서:

```powershell
npm run deploy
```

기존 Worker가 같은 주소로 업데이트됩니다.

## 전체 알림을 잠시 끄는 가장 쉬운 방법

모든 항목의 `enabled`를 `false`로 바꾼 뒤 다시 배포합니다.

또는 Cloudflare 대시보드에서 Worker의 Cron Trigger를 제거할 수도 있지만,
나중에 다시 켜기 쉽게 하려면 `enabled: false` 방식이 더 편합니다.
