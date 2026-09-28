# bye-ad

**광고 차단기가 없을 때** 친절하게 uBlock Origin 설치를 권하는 작은 라이브러리입니다.

대부분의 도구가 "광고 차단기를 감지해서 광고를 보여달라"는 방향이라면,
`bye-ad`는 반대로 **"광고 차단기를 안 쓰고 계시네요. 설치해보시는 건 어때요?"** 라고 말합니다.

---

## 특징

- 광고 차단기가 **없을 때만** 알림을 띄움
- 한국어 / 영어 자동 지원 (브라우저 언어 감지)
- 브라우저에 맞는 설치 링크 제공 (Firefox, Edge, Chrome)
- 확장 프로그램을 설치할 수 없는 환경(iOS, 모바일 Chrome 등)에서는 안내하지 않음
- 쿠키로 한 번 본 사용자는 일정 기간 다시 안 보여줌
- 접근성 고려 (`role="dialog"`, Esc 키로 닫기, 포커스 이동/복원)
- 메시지는 텍스트로만 렌더링되어 XSS에 안전
- 제로 디펜던시, 매우 가벼움
- CDN 한 줄로 바로 사용 가능

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

`byeAd`라는 camelCase 별칭도 사용할 수 있습니다.

```ts
import { byeAd } from 'bye-ad';

byeAd();
```

### CDN (가장 간단한 사용법)

```html
<script src="https://unpkg.com/bye-ad/dist/index.global.js"></script>

<script>
  bye_ad(); // 또는 byeAd();
</script>
```

### SSR (Next.js 등)

서버에서 호출해도 에러 없이 아무 일도 하지 않지만, 브라우저에서만 동작하므로 클라이언트에서 호출하는 것을 권장합니다.

```tsx
useEffect(() => {
  bye_ad();
}, []);
```

---

## 동작 방식

1. 광고처럼 보이는 클래스(`adsbox`, `adsbygoogle`, `ad-banner` 등)를 가진 눈에 보이지 않는 요소(센서)를 페이지에 삽입합니다.
2. 광고 차단기가 처리할 시간을 주기 위해 약 0.8초 동안 반복 확인합니다.
3. 센서가 **숨겨지거나 제거됐다면** 이미 광고 차단기를 쓰는 중이므로 아무것도 하지 않습니다.
4. 센서가 **그대로 남아 있다면** 광고 차단기가 없는 것으로 보고 설치 안내 모달을 띄웁니다.
5. 센서는 결과와 관계없이 항상 제거됩니다.

---

## 옵션

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `cookieName` | `string` | `'bye-ad-shown'` | 쿠키 이름 |
| `cookieDays` | `number` | `30` | 다시 안 보여줄 기간 (일) |
| `lang` | `'ko' \| 'en' \| 'auto'` | `'auto'` | 언어 설정 |
| `messages` | `Partial<ByeAdMessages>` | - | 메시지 직접 지정 |
| `onShow` | `() => void` | - | 모달이 열릴 때 |
| `onClose` | `() => void` | - | 모달이 닫힐 때 |

### 언어 지정 예시

```js
bye_ad({ lang: 'en' });
bye_ad({ lang: 'ko' });
```

### 메시지 커스터마이징

지정할 수 있는 키는 `description`, `ok`, `install` 입니다. 일부만 지정하면 나머지는 기본 메시지를 사용합니다.

```js
bye_ad({
  messages: {
    description: '광고 차단기가 없네요!\n설치해보시는 건 어떨까요?',
    install: '지금 설치하기'
  }
});
```

- 줄바꿈은 `\n` 또는 `<br>`을 사용하세요.
- 그 외 HTML은 **렌더링되지 않고 텍스트 그대로** 표시됩니다.

### 콜백 예시

```js
bye_ad({
  onShow: () => console.log('안내 모달이 열렸습니다'),
  onClose: () => console.log('안내 모달이 닫혔습니다'),
});
```

---

## 설치 링크

브라우저에 따라 아래 링크로 연결됩니다.

| 환경 | 이동 위치 |
|------|-----------|
| Firefox (데스크톱/Android) | uBlock Origin (Mozilla Add-ons) |
| Edge | uBlock Origin (Edge Add-ons) |
| Chrome 등 Chromium 계열 | uBlock Origin Lite (Chrome 웹 스토어) |
| 기타 데스크톱 브라우저 | [ublockorigin.com](https://ublockorigin.com/) |
| iOS, Android의 Firefox 외 브라우저 | 확장 프로그램을 설치할 수 없으므로 모달을 표시하지 않음 |

> Chrome은 Manifest V3 정책으로 uBlock Origin 본체를 설치할 수 없어 uBlock Origin Lite(uBOL)로 안내합니다.

---

## 스타일 변경

기본 스타일은 `<style id="bye-ad-style">`로 주입되며, 아래 클래스를 CSS로 덮어써서 꾸밀 수 있습니다.

| 클래스 | 설명 |
|--------|------|
| `.bye-ad-overlay` | 전체 배경 (반투명 오버레이) |
| `.bye-ad-box` | 모달 박스 |

```css
.bye-ad-box {
  background: #fff;
  color: #222;
  border-radius: 12px;
}
```

---

## 한계

- **Pi-hole, AdGuard DNS 같은 네트워크 단위 차단기**는 페이지의 DOM을 건드리지 않아 감지되지 않습니다. 이 경우 광고 차단기를 쓰고 있어도 안내가 표시될 수 있습니다.
- `style-src`를 엄격하게 제한하는 CSP 환경에서는 `<style>` 주입이 막혀 모달의 기본 스타일이 적용되지 않을 수 있습니다.
- 페이지 자체 CSS가 센서 클래스(`.advertisement` 등)를 숨기는 경우, 광고 차단기가 있는 것으로 판단되어 안내가 표시되지 않습니다.

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
