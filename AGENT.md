# GitHub-Flow 브랜치 전략 가이드 (GitHub-Flow Strategy Guide)

GitHub-flow는 **지속적 배포(Continuous Delivery)**에 최적화된 가볍고 단순한 워크플로우입니다. 복잡한 Release 브랜치 없이 `main` 브랜치를 중심으로 신속하게 기능을 개발하고 배포하는 것을 목표로 합니다.

## 📌 핵심 원칙
1. **`main` 브랜치는 항상 배포 가능한 상태여야 한다.**
2. 새로운 작업은 `main`에서 브랜치를 생성하여 시작한다.
3. 브랜치 이름은 작업 내용을 명확히 알 수 있게 작성한다 (예: `feature/login`, `bugfix/issue-1`).
4. 개발 중 피드백이 필요하거나 완료되었을 때 **Pull Request(PR)**를 생성한다.
5. 코드 리뷰와 테스트가 완료되면 `main`에 머지(Merge)하고 즉시 배포한다.
6. **PR, PR Description, commit message는 모두 한국어**로 작성한다. 

---

## 🛠️ 작업 프로세스 (6단계)

### 1. 브랜치 생성 (Create a Branch)
`main` 브랜치로부터 새로운 기능을 위한 브랜치를 만듭니다. 
- **명령어:** `git checkout -b feature/new-task`

### 2. 커밋 추가 (Add Commits)
작업을 진행하며 로컬에서 커밋을 쌓습니다. 수시로 원격 저장소에 Push하여 팀원들에게 진행 상황을 공유합니다.
- **명령어:** `git add .` -> `git commit -m "Add: description"` -> `git push origin feature/new-task`

### 3. Pull Request 생성 (Open a PR)
코드 작성이 완료되면 `main` 브랜치로 합쳐달라는 요청(PR)을 보냅니다. 작업 중이라도 조언이 필요하면 'Draft PR'을 통해 소통할 수 있습니다.

### 4. 코드 리뷰 및 토론 (Review & Discuss)
팀원들이 코드를 검토하고 의견을 남깁니다. 승인(Approve)을 받기 전까지 피드백에 따라 코드를 수정하고 추가 커밋을 올립니다.

### 5. 테스트 및 배포 (Test & Deploy)
머지하기 전, 해당 브랜치의 코드가 실제 환경이나 테스트 환경에서 정상 작동하는지 확인합니다. GitHub-flow는 **머지 전 배포**를 통해 안정성을 검증하는 것을 권장합니다.

### 6. 머지 및 브랜치 삭제 (Merge & Clean up)
검증이 완료되면 `main` 브랜치로 머지합니다. 사용이 끝난 브랜치는 삭제하여 저장소를 청결하게 유지합니다.

---

## 커밋 메시지 가이드 (Conventional Commits)

### 유형 (Type)

| 유형 | 의미 | 사용 예시 |
| :--- | :--- | :--- |
| `feat` | 새로운 기능 추가 | `feat: 로그인 기능 구현` |
| `fix` | 버그 수정 | `fix: 이메일 중복 확인 로직 오류 수정` |
| `!BREAKING CHANGE` | 커다란 API 변경 (기존 코드와 호환되지 않음) | `feat!: 사용자 인증 방식 JWT로 전면 교체` |
| `docs` | 문서 수정 (README.md, 주석 등) | `docs: 설치 가이드 업데이트` |
| `style` | 코드 포맷 변경 (세미콜론 누락, 코드 스타일 등, 로직 변경 없음) | `style: 오타 수정 및 들여쓰기 조절` |
| `refactor` | 코드 리팩토링 (기능은 같지만 코드를 개선함) | `refactor: 중복된 유틸리티 함수 통합` |
| `test` | 테스트 코드 추가 및 수정 | `test: 회원가입 API 단위 테스트 추가` |
| `chore` | 빌드 업무 수정, 패키지 매니저 설정, 프로젝트 설정 변경 | `chore: .gitignore 설정 업데이트` |
| `init` | 프로젝트 초기 생성 | `init: 초기 프로젝트 구조 설정` |
| `perf` | 성능 개선 | `perf: 검색 쿼리 속도 최적화` |
| `ci` | CI 설정 파일 및 스크립트 수정 | `ci: GitHub Actions 배포 스크립트 수정` |

## 💡 도입 시 주의사항
- **테스트 자동화:** `main`이 항상 배포 가능해야 하므로 CI/CD를 통한 자동화된 테스트 구축이 필수적입니다.
- **작은 단위의 PR:** 리뷰가 쉽고 빠른 배포가 가능하도록 기능을 작게 쪼개어 작업하는 것이 효율적입니다.