# 자기주도학습 도장판

고등학교 1학년 학생들의 자기주도학습을 독려하는 PWA 웹 앱.

- **프론트엔드**: Next.js (App Router) + Tailwind CSS + Lucide Icons
- **백엔드/DB**: Supabase (Auth, Postgres, Storage)
- **PWA**: Serwist (service worker)

## 역할

- **학생**: 오늘 학습 시작(플래너 사진), 마감(공부 사진 + 시간/내용) 제출, 나의 도장판 확인
- **멘토**: 담당 학생의 오늘 제출 내역 확인, 승인 시 도장 +1 & 응원 메시지 전달
- **관리자(선생님)**: 학생/멘토 등록 및 매칭, 전체 학생 도장 현황 모니터링

## 시작하기

### 1. 환경 변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local`에 Supabase 프로젝트의 URL과 anon key를 채워넣습니다. (Supabase 대시보드 > Project Settings > API)

### 2. 데이터베이스 스키마 적용

`supabase/migrations/`에 초기 스키마(`profiles`, `mentor_student_links`, `study_records`, RLS 정책, storage 버킷 등)가 준비되어 있습니다.

```bash
npx supabase login
npx supabase link --project-ref <project-id>
npx supabase db push
```

또는 Supabase 대시보드의 SQL Editor에 `supabase/migrations/20260820043036_init.sql` 내용을 붙여넣어 실행해도 됩니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인합니다.

> PWA(service worker)는 프로덕션 빌드(`npm run build && npm run start`)에서만 활성화됩니다.

### 4. 타입 재생성 (선택)

Supabase 프로젝트를 연결한 뒤, 손으로 작성된 `src/lib/supabase/types.ts`를 자동 생성 타입으로 교체할 수 있습니다.

```bash
npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/types.ts
```

## 앱 아이콘

`public/icons/icon-192.png`, `public/icons/icon-512.png`를 실제 아이콘 이미지로 교체해야 PWA 설치 시 아이콘이 표시됩니다.
