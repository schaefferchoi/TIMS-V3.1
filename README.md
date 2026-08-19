# TIMS / TYMICT Install Manager

TIMS(TYMICT Install Manager)는 농기계·차량 현장 장착 업무를 기록하고 관리하는 웹 애플리케이션입니다. 장착 담당자가 주문 및 장착 정보, 거래처, 제품, 농기계, 고객, 교육, 소프트웨어 버전과 현장 사진을 한 화면에서 등록할 수 있도록 구성되어 있습니다.

저장된 장착 건은 목록에서 조회·검색·필터링할 수 있으며, 대시보드 통계와 Confluence 페이지 생성·수정·연결·가져오기를 지원합니다. 데이터와 사진 메타데이터는 Supabase Database에 저장하고, 신규 사진 원본은 Cloudflare R2에 저장합니다. 이전에 Supabase Storage에 저장된 사진도 계속 조회·삭제할 수 있습니다.

> 현재 문서는 저장소의 실제 코드와 `feature/admin-v3` 작업 내용을 기준으로 작성했습니다. 저장소에는 SQL 마이그레이션이나 배포 워크플로가 없으므로, 데이터 타입·제약 조건·RLS 정책과 실제 GitHub Pages 설정은 Supabase/GitHub 콘솔에서 별도로 확인해야 합니다.

## 주요 기능

### 대시보드

- 당해 연도 전체, 이번 달, 오늘의 장착 건수 집계
- 교육일이 입력된 건수 집계
- 판매구분, 지역, 제품, 제조사별 순위 집계
- Chart.js를 이용한 월별 장착 추이 차트

### 장착 정보 등록 및 관리

- 주문접수일, 장착일·시간, 판매구분과 거래처 정보 등록
- 제품 및 시리얼, 장착 부품, 후방카메라 정보 등록
- 농기계 정보 등록 및 PLUS 제품의 두 번째 농기계 입력 영역 제어
- 고객·교육 정보, 소프트웨어/펌웨어 버전, 작업자와 이슈 등록
- 신규 장착 건 생성, 기존 건 조회·수정·삭제
- 입력 중 다른 탭으로 이동할 때 저장 여부 확인
- 필수 사진 누락 안내 UI

### 사진 업로드 및 관리

- 전체, 차량, 기대번호, 후방카메라, EPS, CPG, ACU, 버전 사진 분류
- 여러 파일 선택, 업로드 전 미리보기 및 임시 사진 제거
- 저장된 사진 조회, 원본 열기, Storage와 DB 메타데이터 동시 삭제
- 사진 파일을 장착 레코드 ID와 사진 종류 기반 경로로 저장

### 저장목록 검색과 필터

- 고객명, BOX/KEYPAD S/N, 모델명, 거래처, 제품, 제조사, 장착직원 통합 검색
- 오늘, 이번 주, 이번 달, 저장완료, 사진 미등록 필터
- 목록에서 상세 보기, 삭제, Confluence 열기 또는 생성

### Confluence 연동

- 저장된 장착 정보와 사진을 기반으로 Confluence 페이지 생성
- 이미 연결된 Page ID가 있으면 기존 페이지의 버전을 올려 수정
- Confluence URL 또는 Page ID를 장착 레코드에 연결하고 페이지 열기
- 기존 Confluence 페이지의 표 데이터를 장착등록 폼으로 가져오기
- 페이지의 첨부파일 정보를 분석하고 Edge Function을 통해 이미지를 다운로드하는 처리 코드

### 관리자 및 마스터 데이터 관리

- `master_installers`, `master_dealers`를 동일한 관리 엔진으로 처리
- 장착직원과 거래처 조회·추가·수정
- 활성/비활성 전환 및 표시 순서 변경
- 활성 마스터 데이터를 장착등록 화면의 거래처와 장착직원 선택 항목에 반영
- 마스터 조회 실패 또는 빈 목록일 때 기존 정적 선택 항목 유지

### 내보내기 기능

현재 실행되는 `index.html`과 `script.js`에는 CSV 또는 PDF 내보내기 기능이 구현되어 있지 않습니다. `index_v1_backup.html`에는 CSV 내보내기와 인쇄 버튼 문구가 남아 있지만 연결된 구현 함수는 현재 저장소에서 확인되지 않으므로 지원 기능에 포함하지 않습니다.

## 기술 스택

| 구분 | 기술 | 코드에서 확인된 용도 |
| --- | --- | --- |
| 프런트엔드 | HTML5, CSS3, Vanilla JavaScript | 단일 페이지 탭 UI, 폼, 목록, 모달, 관리자 화면 |
| 백엔드 서비스 | Supabase JavaScript Client v2 | Database CRUD와 기존 Storage 사진 호환 |
| 데이터베이스 | Supabase Database | 장착 기록, 사진 메타데이터, 마스터 데이터 저장 |
| 파일 저장소 | Cloudflare R2, Supabase Storage | 신규 사진 원본 저장, 기존 사진 호환 |
| 사진 API | Cloudflare Workers, TypeScript | R2 사진 업로드·조회·삭제와 CORS 처리 |
| 서버리스 | Supabase Edge Functions, Deno, TypeScript | Confluence REST API 프록시 및 페이지/첨부파일 처리 |
| 외부 연동 | Confluence REST API | 템플릿 조회, 페이지 생성·수정·가져오기 |
| 차트 | Chart.js | 월별 장착 추이 시각화 |
| 브라우저 API | Fetch API, File/Blob, Web Crypto, localStorage | Edge Function 호출, 사진 처리, 파일명 생성, Confluence 설정 저장 |
| 웹 앱 메타데이터 | Web App Manifest, Service Worker 파일 | 설치형 표시 정보와 캐시 코드 제공 |
| 호스팅 | GitHub Pages 호환 정적 구성 | 별도 빌드 산출물 없이 저장소 루트 파일 배포 가능 |

Supabase JS와 Chart.js는 `index.html`에서 CDN으로 로드합니다. 패키지 매니저나 번들러 설정은 없습니다. `service-worker.js`는 존재하지만 현재 코드에서 등록하는 로직은 확인되지 않았습니다.

## 프로젝트 파일 구조

주요 실행 파일은 프로젝트 루트에 있고, 서버리스 코드는 서비스별 하위 폴더에 있습니다.

```text
.
├── README.md              # 프로젝트 설명과 실행·운영 문서
├── CHANGELOG.md           # 버전별 변경 이력
├── index.html             # 현재 애플리케이션 화면과 탭·폼·모달 마크업
├── style.css              # 기본 화면, 폼, 목록, 사진, 대시보드 스타일
├── script.js              # 장착·사진·목록·대시보드·Confluence 클라이언트 로직
├── admin.js               # 장착직원/거래처 공통 마스터 관리 엔진
├── admin.css              # 관리자 마스터 화면 전용 스타일
├── supabase.js            # 전역 Supabase 클라이언트 초기화
├── index.ts               # Confluence 페이지 생성·수정 Edge Function 소스
├── cloudflare/
│   └── tims-photo-storage/ # R2 사진 API Worker 소스와 Wrangler 설정
├── supabase/
│   └── functions/         # Confluence 관련 Edge Function 소스
├── manifest.json          # 웹 앱 이름, 시작 URL, 테마 정보
├── service-worker.js      # 루트/HTML/manifest 캐시 로직
└── index_v1_backup.html   # 이전 버전 화면 백업
```

`admin.js`와 `admin.css`는 현재 `feature/admin-v3` 작업 트리의 관리자 기능 파일입니다. `index_v1_backup.html`은 현재 진입점이 아니므로 현행 기능 판단에는 사용하지 않습니다.

## 데이터 구조

저장소에 SQL 스키마 파일은 없습니다. 아래 내용은 JavaScript에서 실제 조회·삽입·수정하는 테이블과 컬럼만 정리한 것입니다. 컬럼 타입, 기본값, 인덱스, 외래키, 유일성 제약 및 RLS 정책은 코드만으로 확인할 수 없습니다.

### `install_records`

장착 업무 한 건의 폼 데이터와 Confluence 연결 상태를 저장합니다.

코드에서 확인되는 컬럼은 다음과 같습니다.

- 식별·상태: `id`, `created_at`, `status`
- 일정: `order_date`, `install_date`, `install_start_time`, `install_end_time`
- 거래처: `sales_type`, `dealer_name`, `dealer_region`, `representative`
- 제품: `product_name`, `box_sn`, `keypad_sn`, `spline`, `bracket`, `rear_camera`
- 농기계 1: `machine_type`, `manufacturer`, `model_sn`, `horsepower`, `machine_number`
- 농기계 2: `machine_type_2`, `manufacturer_2`, `model_sn_2`, `horsepower_2`, `machine_number_2`
- 고객·교육: `customer_name`, `customer_phone`, `customer_address`, `crop_and_scale`, `education_date`, `education_staff`
- 버전: `ad_a1_software`, `coa_fw`, `ins_ver`, `moa_fw`, `cpg_fw`, `adc2`, `cpad_sw`
- 작업·이슈: `install_subject`, `installer`, `major_issue`, `customer_request`, `memo`
- Confluence: `confluence_page_id`, `confluence_page_url`, `confluence_status`, `confluence_updated_at`

일부 컬럼은 조회 또는 화면 표시 코드에서만 참조되므로 실제 운영 DB 존재 여부는 Supabase 스키마에서 재확인해야 합니다.

### `install_photos`

R2 또는 기존 Supabase Storage에 업로드된 사진과 장착 레코드의 연결 정보를 저장합니다.

| 확인된 컬럼 | 용도 |
| --- | --- |
| `id` | 사진 메타데이터 삭제 시 사용하는 식별자 |
| `record_id` | `install_records`의 장착 건과 연결 |
| `photo_type` | 사진 분류 |
| `photo_path` | Storage 내부 파일 경로 |
| `photo_url` | 공개 사진 URL |
| `created_at` | 사진 목록 정렬 |
| `storage_provider` | `r2` 또는 `supabase` 저장소 구분 |
| `storage_delete_token` | R2 객체 삭제용 개별 토큰; Supabase 사진은 `null` |

코드에서 사용하는 `photo_type` 값은 `install`, `vehicle`, `machineNumber`, `rearCamera`, `eps`, `cpg`, `acu`, `version`입니다.

### `master_installers`

장착직원 선택 항목을 관리합니다. 코드에서 확인되는 컬럼은 `id`, `name`, `is_active`, `sort_order`입니다.

### `master_dealers`

거래처 선택 항목을 관리합니다. 코드에서 확인되는 컬럼은 `id`, `name`, `is_active`, `sort_order`입니다.

이 네 테이블 외에 현재 실행 코드에서 참조하는 Supabase Database 테이블은 확인되지 않았습니다.

## 사진 저장소 및 Edge Functions

### 사진 저장 방식

사진은 먼저 브라우저에서 종류별로 미리보기 및 용량 최적화됩니다. 장착 레코드가 저장되면 신규 파일은 Cloudflare Worker를 통해 비공개 R2 버킷에 업로드하고, Worker 공개 조회 URL과 객체 경로를 `install_photos`에 저장합니다.

```text
{recordId}/{photoType}_{timestamp}_{randomUUID}.{extension}
```

- R2 bucket: `tims-install-photos`
- Worker: `cloudflare/tims-photo-storage`
- 신규 사진 공개 URL: Worker의 `/photos/{photo_path}` 경로
- 기존 사진: `storage_provider` 기본값 `supabase`로 구분하여 `install-photos` 버킷 URL을 그대로 사용
- 삭제: 저장소 유형에 맞춰 원본 객체를 먼저 삭제한 뒤 `install_photos` 행 삭제

R2 버킷 자체의 공개 개발 URL은 사용하지 않으며 Worker를 통해서만 객체를 제공합니다. 허용 Origin과 최대 업로드 크기는 `cloudflare/tims-photo-storage/wrangler.jsonc`에서 관리합니다.

기존 Supabase Storage 사진을 R2로 이전하거나 저장소 사용량을 점검할 때는 다음 도구를 사용합니다.

```bash
node scripts/migrate-supabase-photos-to-r2.mjs status
node scripts/migrate-supabase-photos-to-r2.mjs backup
node scripts/migrate-supabase-photos-to-r2.mjs copy
node scripts/migrate-supabase-photos-to-r2.mjs verify
node scripts/migrate-supabase-photos-to-r2.mjs sample-hash
```

DB 주소 전환과 원본 삭제 모드는 R2 전수 검증과 별도 백업 후에만 실행해야 합니다. 실행 상태와 삭제 토큰이 포함된 매니페스트 및 목록 백업은 `.migration/`, `migration-backups/`에 생성되며 Git에는 포함하지 않습니다.

### Edge Functions

클라이언트가 호출하는 함수는 다음 두 가지입니다.

| 함수명 | 코드에서 확인된 역할 |
| --- | --- |
| `smooth-action` | 장착 정보와 사진을 전달해 Confluence 페이지를 생성하거나 기존 페이지를 수정 |
| `import-confluence` | 기존 페이지 HTML·첨부파일 정보를 가져오고, 요청 모드에 따라 첨부 이미지를 다운로드 |

루트의 `index.ts`에는 Deno 기반의 Confluence 템플릿 조회, HTML 치환, 페이지 생성 및 버전 증가 수정 로직이 있습니다. 다만 저장소에 Supabase Functions 디렉터리나 배포 설정이 없어 이 파일과 배포된 함수명의 직접적인 매핑은 확인할 수 없습니다. `import-confluence`의 서버 측 소스도 저장소에는 없습니다.

## Confluence 연동 구조

1. 설정 화면에서 Confluence URL, 이메일, API 토큰, Space Key를 입력합니다.
2. 브라우저는 설정값을 `localStorage`의 `confUrl`, `confEmail`, `confToken`, `confSpace` 키에 저장합니다.
3. 동기화할 때 `install_records`와 `install_photos`를 조회해 Edge Function으로 전달합니다.
4. Page ID가 없으면 템플릿을 기반으로 새 페이지를 만들고, 있으면 현재 버전을 조회한 뒤 다음 버전으로 수정합니다.
5. 반환된 Page ID와 URL, 동기화 상태와 시각을 `install_records`에 기록합니다.
6. 연결 기능은 URL 또는 Page ID를 직접 입력받아 기존 페이지를 장착 건과 연결합니다.
7. 가져오기 기능은 기존 페이지의 표를 분석해 폼 필드에 채우고, 첨부파일 이름을 사진 섹션별로 분류합니다. 첨부 이미지 다운로드 함수도 구현되어 있으나 현재 가져오기 흐름에서 실제 호출되는지는 추가 확인이 필요합니다.

인증 정보는 README나 소스에 하드코딩하지 말고 별도 비밀 관리 방식으로 처리해야 합니다.

## 실행 및 설정 방법

### 로컬 실행

Node.js 빌드, 패키지 설치 또는 번들링 과정은 필요하지 않습니다. CDN과 브라우저 API를 사용하므로 인터넷 연결과 Supabase 접근 권한이 필요합니다.

저장소 루트에서 정적 파일 서버를 실행합니다.

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 엽니다. 단순히 `index.html`을 직접 열 수도 있지만 브라우저의 로컬 파일 보안 정책을 피하려면 HTTP 서버 사용을 권장합니다.

### Supabase 설정

- 클라이언트 생성 위치: `supabase.js`
- 로드 순서: Supabase JS CDN → `supabase.js` → `script.js` → `admin.js`
- 필요한 리소스: Database 테이블, 기존 사진용 `install-photos` Storage bucket, Confluence Edge Functions, `tims-install-photos` R2 bucket과 사진 Worker
- 실제 운영 전 Database RLS와 Storage 정책을 Supabase 대시보드에서 확인해야 합니다.

### Confluence 설정

앱의 **설정** 탭에서 URL, 이메일, API 토큰, Space Key를 입력합니다. 현재 구현은 이를 브라우저 `localStorage`에 저장합니다. 실제 값을 README, 커밋, 이슈 또는 화면 캡처에 포함하지 마세요.

### GitHub Pages 배포

프로젝트는 저장소 루트의 `index.html`을 진입점으로 사용하는 정적 사이트이므로 별도 빌드 단계 없이 GitHub Pages에 게시할 수 있는 구조입니다. 현재 저장소에는 Pages용 GitHub Actions 워크플로 또는 배포 설정 파일이 없습니다.

배포 시 GitHub 저장소의 **Settings → Pages**에서 운영 브랜치인 `main`과 루트 디렉터리를 게시 소스로 지정합니다. 실제 게시 소스와 사용자 지정 도메인 여부는 저장소 설정에서 확인해야 합니다.

## Git 브랜치 운영 규칙

| 브랜치 | 역할 |
| --- | --- |
| `main` | 운영 및 GitHub Pages 배포용 |
| `develop` | 기능 통합 및 배포 전 테스트용 |
| `feature/admin-v3` | 관리자 및 마스터 데이터 기능 개발용 |
| `feature/*` | 개별 기능 개발용 |

기능 개발은 `feature/*` 브랜치에서 진행합니다. 기능 테스트 후 `develop`에 병합하고, 통합 테스트와 최종 확인을 마친 뒤 `main`에 병합합니다. 운영 브랜치에서 직접 기능을 개발하지 않습니다.

> 현재 로컬 체크아웃 브랜치명은 Codex 작업 접두사가 포함된 `codex/feature/admin-v3`입니다. 이 문서 작업은 해당 브랜치에서만 수행했습니다.

## 보안 주의사항

- Supabase 키, Confluence 이메일·API 토큰·비밀번호를 README, 커밋, 이슈에 작성하지 않습니다.
- `supabase.js`에는 현재 Supabase 프로젝트 연결 정보와 브라우저용 키가 직접 선언되어 있습니다. 공개 클라이언트 키를 사용하더라도 RLS와 Storage 정책을 반드시 적용하고, 민감 권한을 가진 키는 절대 브라우저 코드에 두지 않습니다.
- Confluence 인증 정보는 현재 브라우저 `localStorage`에 평문으로 저장됩니다. 공용 PC 사용, 브라우저 프로필 공유 및 개발자 도구 노출에 주의해야 하며 향후 서버 측 비밀 관리로 이전하는 것이 안전합니다.
- Edge Function이 외부 API 인증을 처리하도록 하고, 로그에 토큰이나 전체 요청 본문을 남기지 않습니다.
- 실제 운영 URL, 이메일, 토큰, 비밀번호는 이 문서에 포함하지 않았습니다.

## 현재 구현 상태

| 상태 | 항목 | 근거 또는 비고 |
| --- | --- | --- |
| 구현 완료 | 장착 정보 생성·조회·수정·삭제 | `install_records` CRUD 코드 확인 |
| 구현 완료 | 종류별 사진 업로드·조회·삭제 | `install-photos`, `install_photos` 연동 코드 확인 |
| 구현 완료 | 목록 검색 및 날짜·상태·사진 필터 | `applyRecordFilters()` 확인 |
| 구현 완료 | 대시보드 집계와 월별 차트 | Supabase 집계 로직과 Chart.js 렌더링 확인 |
| 구현 완료 | Confluence 생성·수정·연결·열기·가져오기 | 클라이언트 호출 및 Edge Function 소스 확인 |
| 개발 중 | 장착직원·거래처 마스터 관리 | `feature/admin-v3`의 공통 관리 엔진 구현, 운영 DB/RLS 연동 검증 필요 |
| 개발 중 | 필수 사진 누락 확인 | UI와 처리 코드가 작업 트리에 있으며 브라우저 동작 검증 필요 |
| 확인 필요 | Confluence 첨부 이미지 다운로드의 전체 호출 흐름 | 다운로드 함수는 있으나 가져오기 본 흐름의 호출 연결은 확인되지 않음 |
| 확인 필요 | PWA 오프라인 캐시 활성화 | manifest와 Service Worker 파일은 있으나 등록 코드가 없음 |
| 확인 필요 | Supabase 스키마·정책과 Edge Function 배포 상태 | SQL 및 Functions 배포 설정이 저장소에 없음 |
| 미구현 | CSV/PDF 내보내기 | 현재 실행 코드에 내보내기 함수나 PDF 라이브러리가 없음 |
| 미구현 | 자동 GitHub Pages 배포 | Actions 워크플로가 없음 |

## 향후 개발 계획

아래 항목은 현재 구현 기능이 아닌 계획입니다.

- 관리자 마스터 데이터 엔진을 독립 모듈로 정리하고 공통 검증·오류 처리를 강화
- 거래처와 장착직원에 이어 제조사, 제품, 소프트웨어/펌웨어 버전 마스터 관리로 확장
- Supabase 스키마, RLS, Storage 정책 및 Edge Function을 마이그레이션 가능한 구조로 문서화
- Confluence 인증 정보를 브라우저 저장소가 아닌 안전한 서버 측 비밀 관리 방식으로 이전
- CSV/PDF 내보내기 요구사항 확정 후 구현

## 버전

- 현재 README 표기 버전: v3.0
- 변경 이력: `CHANGELOG.md`

## Developer

최병진
