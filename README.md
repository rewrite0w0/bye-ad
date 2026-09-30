# bye-ad

광고 차단기가 감지되지 않았을 때 사용자에게 uBlock Origin 설치를 안내하는 작은 브라우저 라이브러리입니다.

`bye-ad`는 광고 차단기 설치 여부를 직접 확인하지 않고, HTML bait와 network sensor의 차단 여부를 기준으로 동작을 추정합니다.

## 설치

```bash
npm install bye-ad
```

## 사용법

### 1. 광고 bait 추가

페이지에 bait 요소를 직접 추가합니다.

```html
<div
  id="bye-ad-sensor"
  class="ad ads advertisement native-ad"
  data-ad="true"
  aria-hidden="true"
  style="
    position: absolute;
    left: -99999px;
    top: -99999px;
    width: 1px;
    height: 1px;
  "
></div>
```

`display: none`, `visibility: hidden`, `opacity: 0` 등으로 bait를 미리 숨기지 마세요. bye-ad는 bait가 원래 정상적으로 렌더링되는 상태에서 광고 차단기에 의해 제거되거나 숨겨지는 변화를 감지합니다. 처음부터 숨겨져 있으면 사이트가 숨긴 것인지 광고 차단기가 숨긴 것인지 구분할 수 없습니다.

### 2. 실행

#### npm

```ts
import { bye_ad } from "bye-ad";

bye_ad();
```

#### CDN

```html
<div
  id="bye-ad-sensor"
  class="ad ads advertisement native-ad"
  data-ad="true"
  aria-hidden="true"
  style="
    position: absolute;
    left: -99999px;
    top: -99999px;
    width: 1px;
    height: 1px;
  "
></div>

<script src="https://unpkg.com/bye-ad/dist/index.global.js"></script>

<script>
  bye_ad();
</script>
```

CDN에서는 `nativeads.js`를 자동으로 로드합니다.

## 옵션

```ts
bye_ad({
  lang: "ko",
  cookieDays: 7,
  waitMs: 2000,

  messages: {
    description: "광고 차단 프로그램이 감지되지 않았습니다.",
    ok: "닫기",
    install: "uBlock Origin 설치",
  },

  onShow() {
    console.log("modal shown");
  },

  onClose() {
    console.log("modal closed");
  },
});
```

### 옵션

| 옵션                 | 타입                       | 기본값               | 설명                 |
| ------------------ | ------------------------ | ----------------- | ------------------ |
| `sensorId`         | `string`                 | `"bye-ad-sensor"` | bait 요소의 ID        |
| `networkSensorUrl` | `string`                 | 자동                | network sensor URL |
| `cookieName`       | `string`                 | `"bye-shown"`     | 표시 여부를 저장할 쿠키 이름   |
| `cookieDays`       | `number`                 | `1`               | 쿠키 유지 기간           |
| `lang`             | `"ko" \| "en" \| "auto"` | `"auto"`          | 표시 언어              |
| `waitMs`           | `number`                 | `2000`            | 탐지 대기 시간(ms)       |
| `messages`         | `ByeAdMessages`          | -                 | 메시지 커스터마이징         |
| `onShow`           | `() => void`             | -                 | modal 표시 후 실행      |
| `onClose`          | `() => void`             | -                 | modal 닫은 후 실행      |

## 언어

```ts
bye_ad({
  lang: "ko",
});
```

```ts
bye_ad({
  lang: "en",
});
```

```ts
bye_ad({
  lang: "auto",
});
```

`auto`는 브라우저의 언어 설정을 기준으로 한국어 또는 영어를 사용합니다.

## 메시지 변경

```ts
bye_ad({
  messages: {
    description: "광고 차단 프로그램을 사용해 보세요.",
    ok: "닫기",
    install: "설치하기",
  },
});
```

## Network sensor 직접 지정

CDN의 기본 경로가 아닌 별도의 `nativeads.js`를 사용하는 경우:

```ts
bye_ad({
  networkSensorUrl: "/assets/nativeads.js",
});
```

## 동작

`bye-ad`는 두 가지 센서를 확인합니다.

```text
DOM bait
   +
network sensor
   ↓
차단 감지
```

둘 중 하나라도 차단되면 아무 동작도 하지 않습니다.

두 센서가 모두 정상적으로 동작하면 설치 안내 modal을 표시합니다.

> `bye-ad`의 탐지 결과는 광고 차단기의 설치 여부를 보장하지 않으며, 페이지에서 관찰된 차단 동작을 기반으로 한 추정입니다.

## License

MIT

