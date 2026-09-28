# bye-ad

**광고 차단기가 없을 때** 친절하게 uBlock Origin 설치를 권하는 작은 라이브러리입니다.

대부분의 도구가 "광고 차단기를 감지해서 광고를 보여달라"는 방향이라면,  
`bye-ad`는 반대로 **"광고 차단기를 안 쓰고 계시네요. 설치해보시는 건 어때요?"** 라고 말합니다.

---

## 특징

- 광고 차단기가 **없을 때만** 알림을 띄움
- 한국어 / 영어 자동 지원 (브라우저 언어 감지)
- 브라우저에 따라 적절한 uBlock Origin 링크 제공
- 쿠키로 한 번 본 사용자는 일정 기간 다시 안 보여줌
- 제로 디펜던시, 매우 가벼움
- CDN 한 줄로 바로 사용 가능
- 사용자 스타일 존중 (`noStyle` 옵션)

---

## 설치

### npm

```bash
npm install bye-ad
```

```ts
import { bye_ad } from 'bye-ad';

bye_ad();
```

### CDN (가장 간단한 사용법)

```html
<script src="https://cdn.jsdelivr.net/npm/bye-ad@0.1.0/dist/bye-ad.umd.js"></script>
<script>
  bye_ad();
</script>
```

---

## 필요한 HTML 구조

```html
<!-- 광고 차단기가 숨기는 센서 -->
<div
  id="ad-sensor"
  class="ad native-ad ad-banner adsbygoogle ad-container advertisement"
  style="position:absolute; width:1px; height:1px; opacity:0; pointer-events:none;"
></div>

<!-- 알림 모달 -->
<div id="ad-note-modal">
  <div id="ad-note-box">
    <p>광고 차단기가 감지되지 않았습니다.<br>
       uBlock Origin을 설치하면 더 빠르고 안전하게 인터넷을 쓸 수 있어요.</p>
    <button id="ad-note-ok">OK</button>
    <button id="ad-note-install">설치하러 가기</button>
  </div>
</div>
```

---

## 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `sensorSelector` | `string` | `'#ad-sensor'` | 광고 차단기가 숨기는 요소 |
| `modalSelector` | `string` | `'#ad-note-modal'` | 알림 모달 |
| `cookieName` | `string` | `'bye-ad-shown'` | 쿠키 이름 |
| `cookieDays` | `number` | `30` | 다시 안 보여줄 기간 (일) |
| `noStyle` | `boolean` | `false` | `true`면 기본 스타일 주입 안 함 |
| `lang` | `'ko' \| 'en' \| 'auto'` | `'auto'` | 언어 설정 |
| `messages` | `object` | - | 메시지 직접 지정 |
| `onShow` | `() => void` | - | 모달이 열릴 때 |
| `onClose` | `() => void` | - | 모달이 닫힐 때 |

### 언어 지정 예시

```js
bye_ad({ lang: 'en' });
bye_ad({ lang: 'ko' });
```

### 메시지 커스터마이징

```js
bye_ad({
  messages: {
    description: '광고 차단기가 없네요!<br>설치해보시는 건 어떨까요?',
    install: '지금 설치하기'
  }
});
```

---

## 개발

```bash
npm install
npm run dev      # 개발 서버
npm run build    # dist 생성
```

---

## 라이선스

MIT
```
