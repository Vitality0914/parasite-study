# 기생충학 학명 트레이닝 — GitHub Pages 배포본

이 폴더 하나에 시작 화면, 1번 학명 타자연습, 2번 기생충 꼬맨틀과 각 앱의 데이터가 모두 포함되어 있습니다.

## 구조

- `index.html`: 타자연습·꼬맨틀 시작 화면
- `typing/`: 1번 학명 타자연습 전체 파일
- `semantle/`: 2번 기생충 꼬맨틀 전체 파일
- `.nojekyll`: GitHub Pages 정적 파일 처리용
- `assets/fonts/`: GitHub Pages에 함께 배포되는 Pretendard Variable 웹폰트와 라이선스
- `dev-tools/`: 데이터 재생성·배포 구조 검증 도구

## GitHub Pages 배포

이 폴더의 **내용 전체**를 GitHub 저장소의 배포 루트에 올린 뒤 Pages의 배포 대상을 해당 브랜치의 `/ (root)`로 설정합니다.

두 앱은 외부 서버나 API 없이 정적 HTML·CSS·JavaScript·데이터 파일만으로 작동합니다.

## 꼬맨틀 난도

- `Easy`: 영문 학명을 입력할 때 선택한 강의 범위의 후보를 표시합니다.
- `Hard`: 후보 없이 등록된 영문 학명을 직접 입력합니다.

두 난도 모두 한글 입력은 허용하지 않습니다.
