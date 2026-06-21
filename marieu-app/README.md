# MarieU 회원가입 신청서 웹앱

단계별 마법사 형태의 회원가입 신청서입니다. 제출된 데이터는 **Supabase**(PostgreSQL DB)에
**암호화되어** 저장되고, 소스코드는 **GitHub**, 호스팅/서버 기능은 **Netlify**가 담당합니다.

```
[사용자 브라우저] → index.html (입력)
        │  제출 버튼 클릭
        ▼
[Netlify Function] submit-application.js  ← 여기서 AES-256-GCM 암호화
        ▼
[Supabase DB]  applications 테이블 (암호화된 형태로만 저장)
```

## 폴더 구성

```
marieu-app/
├── index.html                       # 신청서 웹앱 (사용자용)
├── admin.html                       # 제출 목록 조회 (관리자용, 비밀번호 보호)
├── netlify/functions/
│   ├── submit-application.js        # 제출 처리 + 암호화 + DB 저장
│   └── list-applications.js         # 관리자용 조회 + 복호화
├── supabase/schema.sql               # Supabase에 실행할 테이블 생성 SQL
├── netlify.toml                      # Netlify 설정
├── package.json                      # Netlify Functions 의존성
├── .env.example                      # 필요한 환경변수 목록 (실제 값 X)
└── .gitignore
```

## 설정 순서

### 1) Supabase 프로젝트 생성
1. https://supabase.com 에서 무료 계정 생성 → "New Project" 생성
2. 좌측 메뉴 **SQL Editor** 에서 `supabase/schema.sql` 내용을 그대로 붙여넣고 실행
3. 좌측 메뉴 **Project Settings → API** 에서 아래 두 가지 값을 복사해둡니다.
   - `Project URL` → `SUPABASE_URL`
   - `service_role` 키 (⚠ `anon` 키 아님, 비밀로 취급) → `SUPABASE_SERVICE_ROLE_KEY`

### 2) GitHub 저장소에 코드 업로드
이 폴더 전체를 GitHub 저장소에 올립니다. (※ `.env` 파일은 절대 올리지 않습니다 — `.gitignore`에 이미 포함되어 있습니다.)

### 3) Netlify에서 GitHub 저장소 연결
1. https://app.netlify.com → "Add new site" → "Import an existing project" → GitHub 저장소 선택
2. Build settings는 비워둬도 됩니다 (정적 파일 + Functions만 사용)
3. **Site settings → Environment variables** 에서 아래 4가지를 등록합니다.

| 변수명 | 값 |
|---|---|
| `SUPABASE_URL` | 1단계에서 복사한 Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 1단계에서 복사한 service_role 키 |
| `ENCRYPTION_KEY` | 64자리 hex 문자열 (아래 명령으로 생성) |
| `ADMIN_PASSWORD` | 관리자 페이지(admin.html) 접속 비밀번호, 원하는 값 |

`ENCRYPTION_KEY` 생성 명령 (터미널에서):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

4. 환경변수 등록 후 **"Trigger deploy"** 로 재배포

### 4) 확인
- 신청서: `https://your-site.netlify.app/`
- 관리자 페이지: `https://your-site.netlify.app/admin.html` (ADMIN_PASSWORD 입력 후 조회)

## 보안 설계 핵심

- 브라우저(클라이언트)에는 Supabase 키가 전혀 포함되지 않습니다. 제출은 항상 Netlify Function을 거칩니다.
- 주민등록번호를 포함한 신청서 전체 내용은 Netlify Function 내부에서 **AES-256-GCM**으로 암호화된 뒤에만 DB에 저장됩니다.
- 암호화 키(`ENCRYPTION_KEY`)는 Netlify 환경변수에만 존재하며, GitHub 저장소나 DB에는 절대 평문으로 남지 않습니다.
- Supabase 테이블은 Row Level Security(RLS)가 활성화되어 있고 공개 정책이 없으므로, `service_role` 키 없이는 외부에서 절대 조회/입력할 수 없습니다.
- 관리자 페이지는 `ADMIN_PASSWORD`로 보호되며, 그 비밀번호를 아는 사람만 복호화된 내용을 볼 수 있습니다.

## 주의사항 (법적 책임은 사용자에게 있습니다)

이 구조는 합리적인 보안 수준을 제공하지만, 실제 운영 전에 아래를 반드시 확인하세요.
- 개인정보보호법상 주민등록번호 수집·보관에 대한 법적 근거와 추가 동의 절차가 적절한지
- 개인정보 보유기간 경과 후 파기 절차(자동 삭제 등)를 구현했는지
- 회사 내부 개인정보보호 책임자 또는 법률 전문가의 검토를 받았는지

이 코드는 기술적 가이드일 뿐이며, 법적 컴플라이언스를 보증하지 않습니다.
