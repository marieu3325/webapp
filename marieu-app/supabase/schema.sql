-- ============================================================
-- MarieU 회원가입 신청서 - Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에서 그대로 실행하세요.
-- ============================================================

-- UUID 생성 함수 사용을 위한 확장 (Supabase는 기본 활성화되어 있는 경우가 많음)
create extension if not exists "pgcrypto";

create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- 목록 확인/검색용 최소 정보 (암호화하지 않음)
  name  text not null,
  phone text,
  email text,

  -- 나머지 전체 항목(주민등록번호, 자산, 가족사항, 자기소개 등)은
  -- Netlify Function에서 AES-256-GCM으로 암호화한 뒤 이 컬럼에만 저장됩니다.
  -- 암호화 키(ENCRYPTION_KEY)는 Netlify 환경변수에만 보관되며 GitHub/DB 어디에도 평문으로 남지 않습니다.
  encrypted_payload text not null
);

-- 행 단위 보안(RLS) 활성화.
-- 아래에서 별도 정책(policy)을 만들지 않으므로,
-- anon/authenticated 역할은 이 테이블에 절대 접근할 수 없습니다.
-- Netlify Function은 "service_role" 키를 사용하므로 RLS와 무관하게 접근 가능합니다.
alter table applications enable row level security;

-- (참고) 정책을 추가하지 않은 상태 = 기본적으로 모든 접근 거부.
-- 이것이 의도된 동작입니다. 외부에서 누구도 이 표를 직접 읽거나 쓸 수 없습니다.


-- ============================================================
-- 준회원(문의했지만 정식 가입은 하지 않은 분) 리스트
-- 관리자 페이지(admin.html)에서 직접 추가/수정/삭제합니다.
-- ============================================================

create table if not exists prospects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  name   text not null,
  phone  text,
  gender text,
  age    text,
  region text,
  job    text,
  note   text
);

alter table prospects enable row level security;
-- applications와 동일하게, 정책을 추가하지 않으므로 service_role 키를 사용하는
-- Netlify Function을 통해서만 접근 가능합니다.
