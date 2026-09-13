# 작업 규칙

## 프론트엔드 수정 시

`src/admin-ui.html`을 수정한 뒤에는 반드시 아래 순서를 전부 실행하고 보고할 것.

1. `npm run build:admin-ui` — 원본을 Worker가 서빙하는 형태로 재생성
2. `npm run deploy` — 실제 배포
3. `curl.exe "https://discord-break-reminder.soleil666111.workers.dev/" -o check.html`
   후 방금 수정한 내용이 실제로 반영됐는지 확인

빌드나 배포를 빠뜨리면 화면이 바뀌지 않은 것처럼 보이는 문제가 반복해서
발생했음. "수정 완료"라고 보고하기 전에 위 3단계를 전부 마쳤는지 스스로
점검할 것.
