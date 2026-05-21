# 공용 캠핑 장비 정하기

두 가족이 캠핑 갈 때 공용 장비를 누가 챙길지 정하는 모바일 웹앱입니다.

## 파일

- `index.html`: 웹페이지
- `style.css`: 모바일 화면 스타일
- `app.js`: 화면 동작과 데이터 요청
- `apps-script.js`: Google Apps Script에 붙여 넣을 구글시트 API 코드

## 사용 방법

1. Google Apps Script에서 새 프로젝트를 만듭니다.
2. `apps-script.js` 내용을 붙여 넣습니다.
3. 배포 > 새 배포 > 웹 앱을 선택합니다.
4. 실행 권한은 본인, 액세스 권한은 링크가 있는 모든 사용자로 설정합니다.
5. 배포 후 나온 웹앱 URL을 웹페이지의 설정 화면에 붙여 넣습니다.

Apps Script는 아래 구글시트에 `items` 시트를 만들고 데이터를 저장합니다.

https://docs.google.com/spreadsheets/d/1ZynYR9WBvhZ4kG0FmEWDKpFgl8C6XehxO70XhOSWqzU/edit

## 데이터

저장하는 값은 단순합니다.

- 가족
- 장비명
- 수량
- 최종 선택 가족

Apps Script URL을 넣기 전에는 현재 브라우저의 `localStorage`에만 임시 저장됩니다.
