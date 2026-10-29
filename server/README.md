# 위로그 로컬 음식 구조화 서버

키 없이도 대시보드의 식품 데이터로 영양값을 계산할 수 있습니다. 이 서버는 Gemini 연결을 선택했을 때만 필요합니다. **키를 채팅, HTML, GitHub 파일에 붙여 넣지 마세요.** 브라우저에는 키 입력란이 필요하지 않습니다.

## 실행

Node.js 22 이상이 필요합니다. 외부 패키지를 설치하지 않습니다. `server` 폴더 옆에 공개 대시보드 `index.html`을 두고, 그 상위 폴더에서 PowerShell을 여세요. 다른 위치의 HTML을 쓰려면 `--app` 뒤의 경로를 바꾸면 됩니다.

키 없이 화면을 먼저 열 수 있습니다.

```powershell
node .\server\server.cjs --app .\index.html
```

Gemini를 연결하려면 위 서버를 Ctrl+C로 종료하고 다음을 실행하세요. 키는 화면에 표시되지 않고 명령 기록에 직접 적히지 않습니다. 현재 PowerShell과 Node 프로세스의 환경변수로만 전달하며, 서버 종료 후 지웁니다.

```powershell
$weelogSecret = Read-Host 'Gemini API 키' -AsSecureString
$weelogPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($weelogSecret)
try {
  $env:GEMINI_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($weelogPointer)
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($weelogPointer)
  $weelogSecret.Dispose()
  Remove-Variable weelogSecret, weelogPointer
}
try {
  node .\server\server.cjs --app .\index.html
} finally {
  Remove-Item Env:\GEMINI_API_KEY -ErrorAction SilentlyContinue
}
```

표시된 **http://127.0.0.1:8787**을 여세요. `localhost`라는 다른 이름이나 GitHub Pages 주소에서는 이 서버를 호출하지 않습니다. 기존 GitHub Pages의 브라우저 저장소와 로컬 주소의 저장소는 서로 다릅니다. 필요하면 대시보드에서 암호화 백업을 내려받고 로컬 화면에서 복원하세요. 이 서버는 기록 파일이나 백업을 받거나 저장하지 않습니다.

기본 모델은 `gemini-3.5-flash-lite`입니다. 현재 Google 프로젝트에서 지원하지 않으면 `$env:GEMINI_MODEL = 'gemini-3.1-flash-lite'`로 선택할 수 있습니다. 무료 한도와 청구 여부는 AI Studio 프로젝트 설정을 확인하세요. 서버가 과금 설정을 바꾸지는 않습니다.

## 전송 범위

1. 대시보드가 기기에서 음식 기록을 정리합니다.
2. 사용자가 `닭가슴살 100g, 바나나 1개`처럼 음식명과 양만 남은 미리보기를 확인합니다.
3. 서버가 음식 어휘·입력 길이·요청 출처를 검증한 뒤 Google에 이 목록만 보냅니다.
4. Gemini는 음식명·양·단위만 반환합니다. 원문에 없는 음식이나 양은 서버가 거부합니다.
5. 탄수화물·단백질·지방·열량은 대시보드의 식품 데이터로 계산합니다. Gemini가 영양값을 생성하지 않습니다.

날짜·수술·치료·증상·이름·연락처가 들어간 문장과 확인되지 않은 음식명은 전송하지 않습니다. 해당 음식은 직접 입력하세요. 어휘 검사는 모든 개인정보를 판별하는 장치가 아니므로 전송 미리보기를 확인해야 합니다. Google 무료 서비스는 입력과 출력을 제품 개선에 사용하고 사람이 검토할 수 있습니다. [Google 약관](https://ai.google.dev/gemini-api/terms?hl=en)

## 연결 계약

`GET /api/status` → `{ "ok": true, "configured": false, "model": "gemini-3.5-flash-lite", "capabilities": { "foodParse": true } }`

키 값은 어떤 응답에도 포함하지 않습니다. `configured`는 환경변수의 유무만 나타내며 유효한 키·사용 권한·잔여 한도를 검증한 결과는 아닙니다.

`POST /api/food-parse`

```javascript
fetch('/api/food-parse', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Weelog-Request': 'food-parse'
  },
  body: JSON.stringify({ text: '닭가슴살 100g, 바나나 1개', confirmed: true }),
  signal: controller.signal
});
```

같은 origin의 브라우저가 `Origin` 헤더를 자동으로 보냅니다. 응답 예:

```json
{
  "items": [
    { "name": "닭가슴살", "amount": 100, "unit": "g" },
    { "name": "바나나", "amount": 1, "unit": "개" }
  ],
  "warnings": []
}
```

양을 적지 않았다면 amount와 unit은 둘 다 null입니다. 단위는 `g`, `ml`, `개`, `공기`, `장`, `컵`만 받습니다. 오류는 `{ "error": { "code": "...", "message": "..." } }`입니다. UI는 `message`를 텍스트로 표시하고 저장한 기록은 그대로 두세요.

## 실행 경계

- 이 컴퓨터의 `127.0.0.1`에만 연결합니다. LAN·공개 웹 서버·리버스 프록시 배포용이 아닙니다.
- Host와 Origin을 정확히 검사하고 CORS를 열지 않습니다. POST는 JSON과 전용 헤더가 필요합니다.
- 요청은 8KB, 음식 텍스트는 1,200자/20개, 응답은 64KB로 제한합니다. 동시 요청 1개, 분당 12회·시간당 60회, Google 응답 대기 30초입니다.
- 지정한 HTML 1개만 제공하며 환경 파일·서버 소스·임의 파일 경로를 제공하지 않습니다.
- 입력·결과·키를 서버 로그나 파일에 저장하지 않습니다. 키는 해당 사용자 권한의 프로세스 메모리/환경변수에 존재하므로 신뢰하는 컴퓨터에서 실행하세요.
- 서버의 CSP는 `connect-src 'self'`입니다. HTML의 meta CSP도 `'self'`여야 같은 origin API에 연결할 수 있습니다.
- 인터넷에 공개하려면 사용자 인증, 서버 비밀 저장소, 사용자별 사용 제한을 갖춘 별도 백엔드가 필요합니다. 이 프로그램을 외부 주소에 바인딩하지 마세요.

테스트는 저장소 루트에서 `node work/nutrition/test-server.cjs`로 실행합니다. 로컬 HTTP와 모의 Google 응답으로 검증하며 실제 API 키는 필요하지 않습니다.
