# 직접 추가하는 프로그램

크롤러가 못 가져오는 프로그램(기관 홈페이지에서 직접 본 것 등)은
이 폴더에 `.json` 파일로 넣으면 다음 크롤 때 DB에 반영된다.
파일 이름은 자유이고, 한 파일에 배열로 여러 개를 넣어도 된다.

```json
[
  {
    "externalId": "my-001",
    "institutionName": "국립과천과학관",
    "programName": "어린이 천체관측교실",
    "bookingMethod": "FIRST_COME",
    "status": "OPENING_SOON",

    "description": "망원경으로 달과 토성을 관측",
    "programUrl": "https://www.sciencecenter.go.kr/...",
    "experienceDate": "2026-10-18",
    "bookingOpenAt": "2026-10-01T10:00:00+09:00",
    "bookingCloseAt": "2026-10-10T18:00:00+09:00",
    "price": 5000,
    "ageGroup": "7-12"
  }
]
```

- 필수: `externalId`, `institutionName`, `programName`, `bookingMethod`, `status`
- `externalId`는 파일 안에서 겹치지 않게 아무 값이나. 같은 값으로 다시 넣으면 새로 만들지 않고 갱신한다.
- `bookingMethod`: `FIRST_COME`(선착순) / `LOTTERY`(추첨) / `ALWAYS_AVAILABLE`(상시)
- `status`: `OPENING_SOON` / `OPEN` / `CLOSED` / `UNKNOWN`
- 접수 시각에는 `+09:00`을 붙여야 한국 시간으로 저장된다.

반영: 대시보드의 **지금 수집하기** 버튼을 누르거나 크롤 주기(6시간)를 기다린다.
Docker로 실행 중이면 파일은 이미지에 들어가야 하므로, 파일을 넣은 뒤 `시작하기.bat`
(또는 `docker compose up -d --build`)을 한 번 다시 실행한다.
