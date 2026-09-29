export type Lang = "ko" | "en" | "auto";

export interface ByeAdMessages {
  description?: string;
  ok?: string;
  install?: string;
}

export interface ByeAdOptions {
  /**
   * HTML에 직접 넣는 광고 bait 요소의 id.
   * 기본값: "bye-ad-sensor"
   */
  sensorId?: string;

  /**
   * 네트워크 센서 URL.
   *
   * 지정하지 않으면 CDN에서 로드된 index.global.js 위치를 기준으로
   * ./nativeads.js를 자동으로 찾습니다.
   */
  networkSensorUrl?: string;

  /** 모달 표시 여부를 기록할 쿠키 이름 */
  cookieName?: string;

  /** 쿠키 유지 기간(일). 기본값: 1 */
  cookieDays?: number;

  /** 메시지 언어 */
  lang?: Lang;

  /** 메시지 커스터마이징 */
  messages?: ByeAdMessages;

  /**
   * 광고 차단 여부를 확인하기 위해 기다리는 최대 시간(ms).
   * 기본값: 2000
   */
  waitMs?: number;

  /** 모달이 표시될 때 */
  onShow?: () => void;

  /** 모달이 닫힐 때 */
  onClose?: () => void;
}

const DEFAULT_COOKIE_NAME = "bye-shown";
const DEFAULT_COOKIE_DAYS = 1;
const DEFAULT_WAIT_MS = 2000;

const DEFAULT_SENSOR_ID = "bye-ad-sensor";

const MODAL_ID = "bye-modal";
const MODAL_STYLE_ID = "bye-modal-style";

const NETWORK_SENSOR_LOADED_KEY = "__BYE_AD_NATIVEADS_LOADED__";

const DEFAULT_MESSAGES: Record<"ko" | "en", Required<ByeAdMessages>> = {
  ko: {
    description:
      "광고 차단 프로그램이 감지되지 않았습니다. 광고 차단 프로그램을 사용하면 더 빠르고 쾌적하게 웹을 이용할 수 있습니다.",
    ok: "닫기",
    install: "uBlock Origin 설치",
  },
  en: {
    description:
      "No ad blocker was detected. Using an ad blocker can make your browsing experience faster and more comfortable.",
    ok: "Close",
    install: "Install uBlock Origin",
  },
};

type ByeAdWindow = Window & {
  [NETWORK_SENSOR_LOADED_KEY]?: boolean;
  bye_ad?: typeof bye_ad;
  byeAd?: typeof byeAd;
};

function getLanguage(lang: Lang = "auto"): "ko" | "en" {
  if (lang === "ko" || lang === "en") {
    return lang;
  }

  return navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

function getMessages(
  lang: Lang,
  messages?: ByeAdMessages,
): Required<ByeAdMessages> {
  const defaults = DEFAULT_MESSAGES[getLanguage(lang)];

  return {
    description: messages?.description ?? defaults.description,
    ok: messages?.ok ?? defaults.ok,
    install: messages?.install ?? defaults.install,
  };
}

function getCookie(name: string): string | null {
  const cookies = document.cookie.split(";");

  for (const cookie of cookies) {
    const [key, ...value] = cookie.trim().split("=");

    if (key === name) {
      return decodeURIComponent(value.join("="));
    }
  }

  return null;
}

function setCookie(name: string, days: number): void {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  document.cookie = [
    `${name}=true`,
    `expires=${expires.toUTCString()}`,
    "path=/",
    "SameSite=Lax",
  ].join(";");
}

function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

function getInstallUrl(): string {
  const ua = navigator.userAgent.toLowerCase();

  if (ua.includes("firefox")) {
    return "https://addons.mozilla.org/firefox/addon/ublock-origin/";
  }

  if (ua.includes("edg/")) {
    return "https://microsoftedge.microsoft.com/addons/detail/ublock-origin/odfafepnkmbhccpbejgmiehpchacaeak";
  }

  if (ua.includes("chrome")) {
    return "https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh";
  }

  return "https://ublockorigin.com/";
}

function getDefaultNetworkSensorUrl(): string {
  /*
   * document.currentScript는 bye_ad()가 나중에 호출되는 경우
   * 라이브러리 script가 아니라 호출한 inline script를 가리킬 수 있습니다.
   *
   * 따라서 먼저 모든 script를 검색해서 index.global.js를 찾습니다.
   */

  const scripts = Array.from(document.scripts);

  const libraryScript = scripts.find((script) => {
    if (!script.src) {
      return false;
    }

    try {
      const url = new URL(script.src, document.baseURI);

      return /\/index\.global\.js$/i.test(url.pathname);
    } catch {
      return false;
    }
  });

  if (libraryScript?.src) {
    return new URL("nativeads.js", libraryScript.src).href;
  }

  /*
   * CDN script를 찾지 못했다면 현재 페이지 기준으로
   * nativeads.js를 요청합니다.
   *
   * 직접 번들링하거나 다른 위치에서 사용하는 경우에는
   * networkSensorUrl을 명시하는 것을 권장합니다.
   */
  return new URL("nativeads.js", document.baseURI).href;
}

function injectStyle(): void {
  if (document.getElementById(MODAL_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");

  style.id = MODAL_STYLE_ID;

  style.textContent = `
    #${MODAL_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      box-sizing: border-box;
      background: rgba(0, 0, 0, 0.55);
      font-family:
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }

    #${MODAL_ID} .bye-box {
      width: min(420px, 100%);
      box-sizing: border-box;
      padding: 28px;
      border-radius: 14px;
      background: #fff;
      color: #111;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
    }

    #${MODAL_ID} .bye-description {
      margin: 0 0 20px;
      font-size: 15px;
      line-height: 1.6;
      white-space: pre-line;
    }

    #${MODAL_ID} .bye-buttons {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
    }

    #${MODAL_ID} button,
    #${MODAL_ID} a {
      appearance: none;
      border: 0;
      border-radius: 8px;
      padding: 10px 16px;
      font-size: 14px;
      cursor: pointer;
      text-decoration: none;
      box-sizing: border-box;
    }

    #${MODAL_ID} .bye-install {
      background: #111;
      color: #fff;
    }

    #${MODAL_ID} .bye-close {
      background: #eee;
      color: #111;
    }
  `;

  document.head.appendChild(style);
}

function showModal(
  options: ByeAdOptions,
  cookieName: string,
  messages: Required<ByeAdMessages>,
): void {
  if (document.getElementById(MODAL_ID)) {
    return;
  }

  injectStyle();

  const modal = document.createElement("div");

  modal.id = MODAL_ID;
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");

  const box = document.createElement("div");
  box.className = "bye-box";

  const description = document.createElement("p");
  description.className = "bye-description";
  description.textContent = messages.description;

  const buttons = document.createElement("div");
  buttons.className = "bye-buttons";

  const install = document.createElement("a");

  install.className = "bye-install";
  install.href = getInstallUrl();
  install.target = "_blank";
  install.rel = "noopener noreferrer";
  install.textContent = messages.install;

  const close = document.createElement("button");

  close.className = "bye-close";
  close.type = "button";
  close.textContent = messages.ok;

  close.addEventListener("click", () => {
    modal.remove();

    setCookie(cookieName, options.cookieDays ?? DEFAULT_COOKIE_DAYS);

    options.onClose?.();
  });

  buttons.append(install, close);
  box.append(description, buttons);
  modal.appendChild(box);

  document.body.appendChild(modal);

  options.onShow?.();
}

function isDomBlocked(sensor: HTMLElement): boolean {
  /*
   * uBlock 등의 cosmetic filter가 요소 자체를 제거한 경우
   */
  if (!sensor.isConnected) {
    return true;
  }

  const style = window.getComputedStyle(sensor);
  const rect = sensor.getBoundingClientRect();

  /*
   * display:none
   */
  if (style.display === "none") {
    return true;
  }

  /*
   * visibility:hidden
   */
  if (style.visibility === "hidden") {
    return true;
  }

  /*
   * width / height가 0이 된 경우
   */
  if (rect.width === 0 || rect.height === 0) {
    return true;
  }

  /*
   * hidden attribute
   */
  if (sensor.hidden) {
    return true;
  }

  return false;
}

function watchDomSensor(
  sensor: HTMLElement,
  waitMs: number,
  onBlocked: () => void,
  onFinished: () => void,
): () => void {
  let finished = false;

  let interval: number | undefined;
  let timeout: number | undefined;

  const observer = new MutationObserver(check);

  function cleanup(): void {
    observer.disconnect();

    if (interval !== undefined) {
      window.clearInterval(interval);
    }

    if (timeout !== undefined) {
      window.clearTimeout(timeout);
    }
  }

  function finish(): void {
    if (finished) {
      return;
    }

    finished = true;
    cleanup();
    onFinished();
  }

  function check(): void {
    if (finished) {
      return;
    }

    if (isDomBlocked(sensor)) {
      finished = true;
      cleanup();
      onBlocked();
    }
  }

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class", "id", "hidden"],
  });

  interval = window.setInterval(check, 100);

  timeout = window.setTimeout(() => {
    if (finished) {
      return;
    }

    finish();
  }, waitMs);

  check();

  return cleanup;
}

function loadNetworkSensor(
  url: string,
  waitMs: number,
  onBlocked: () => void,
  onLoaded: () => void,
): () => void {
  let finished = false;

  let timeout: number | undefined;

  const win = window as ByeAdWindow;

  /*
   * 이전 실행의 값을 제거합니다.
   *
   * nativeads.js가 정상적으로 실행되면 다시 true로 변경합니다.
   */
  win[NETWORK_SENSOR_LOADED_KEY] = false;

  const script = document.createElement("script");

  script.src = url;
  script.async = true;
  script.setAttribute("data-bye-ad-network-sensor", "true");

  function cleanup(): void {
    if (timeout !== undefined) {
      window.clearTimeout(timeout);
    }

    script.removeEventListener("load", handleLoad);
    script.removeEventListener("error", handleError);

    /*
     * 테스트용 script 자체는 실행 후 제거합니다.
     *
     * 중요한 점은 script가 제거되어도 nativeads.js가 설정한
     * window flag는 그대로 남는다는 것입니다.
     */
    script.remove();
  }

  function finishLoaded(): void {
    if (finished) {
      return;
    }

    finished = true;
    cleanup();
    onLoaded();
  }

  function finishBlocked(): void {
    if (finished) {
      return;
    }

    finished = true;
    cleanup();
    onBlocked();
  }

  function handleLoad(): void {
    /*
     * script load 이벤트가 발생했더라도 실제 nativeads.js가
     * 정상 실행되었는지 flag를 한 번 더 확인합니다.
     */
    if (win[NETWORK_SENSOR_LOADED_KEY] === true) {
      finishLoaded();
      return;
    }

    /*
     * 정상적인 nativeads.js라면 load 직후 flag가 true여야 합니다.
     * 그렇지 않으면 차단된 것으로 취급합니다.
     */
    finishBlocked();
  }

  function handleError(): void {
    finishBlocked();
  }

  script.addEventListener("load", handleLoad);
  script.addEventListener("error", handleError);

  timeout = window.setTimeout(() => {
    /*
     * 일부 차단 방식은 error 이벤트조차 발생시키지 않고
     * 요청을 조용히 drop할 수 있으므로 timeout도 사용합니다.
     */
    if (win[NETWORK_SENSOR_LOADED_KEY] === true) {
      finishLoaded();
    } else {
      finishBlocked();
    }
  }, waitMs);

  /*
   * body가 아직 없는 상황에서도 동작할 수 있도록
   * documentElement에 추가합니다.
   */
  document.documentElement.appendChild(script);

  return cleanup;
}

function detectAdBlock(
  sensor: HTMLElement,
  networkSensorUrl: string,
  waitMs: number,
): Promise<boolean> {
  /*
   * 반환값:
   *
   * true  = 광고 차단기가 감지됨
   * false = 광고 차단기가 감지되지 않음
   */

  return new Promise((resolve) => {
    let domFinished = false;
    let networkFinished = false;

    let domBlocked = false;
    let networkBlocked = false;

    let resolved = false;

    let cleanupDom: (() => void) | undefined;
    let cleanupNetwork: (() => void) | undefined;

    function cleanup(): void {
      cleanupDom?.();
      cleanupNetwork?.();
    }

    function finish(blocked: boolean): void {
      if (resolved) {
        return;
      }

      resolved = true;
      cleanup();
      resolve(blocked);
    }

    function check(): void {
      /*
       * 둘 중 하나라도 차단되면 즉시 종료합니다.
       *
       * 따라서 DOM bait가 제거되면 네트워크 센서의
       * timeout까지 기다릴 필요가 없습니다.
       */
      if (domBlocked || networkBlocked) {
        finish(true);
        return;
      }

      /*
       * 두 센서가 모두 정상적으로 끝났고 차단되지 않았다면
       * "차단기가 감지되지 않음"으로 판단합니다.
       */
      if (domFinished && networkFinished) {
        finish(false);
      }
    }

    cleanupDom = watchDomSensor(
      sensor,
      waitMs,
      () => {
        domBlocked = true;
        check();
      },
      () => {
        domFinished = true;
        check();
      },
    );

    cleanupNetwork = loadNetworkSensor(
      networkSensorUrl,
      waitMs,
      () => {
        networkBlocked = true;
        check();
      },
      () => {
        networkFinished = true;
        check();
      },
    );
  });
}

let running = false;
let queued = false;

async function run(options: ByeAdOptions): Promise<void> {
  if (running) {
    return;
  }

  running = true;

  try {
    /*
     * 모바일에서는 동작하지 않습니다.
     */
    if (isMobile()) {
      return;
    }

    /*
     * 이미 모달을 본 사용자라면 실행하지 않습니다.
     */
    const cookieName = options.cookieName ?? DEFAULT_COOKIE_NAME;

    if (getCookie(cookieName)) {
      return;
    }

    /*
     * 사용자가 HTML에 직접 넣어야 하는 bait element
     */
    const sensorId = options.sensorId ?? DEFAULT_SENSOR_ID;

    const sensor = document.getElementById(sensorId);

    /*
     * bait가 아예 없다면 광고 차단 여부를 신뢰성 있게
     * 판단할 수 없으므로 아무 동작도 하지 않습니다.
     */
    if (!sensor) {
      console.warn(
        `[bye-ad] #${sensorId} 요소를 찾지 못했습니다. ` +
          `HTML에 광고 bait 요소를 넣었는지 확인하세요.`,
      );

      return;
    }

    /*
     * networkSensorUrl이 지정되어 있으면 그것을 사용하고,
     * 그렇지 않으면 CDN의 index.global.js 위치를 기준으로
     * nativeads.js를 찾습니다.
     */
    const networkSensorUrl =
      options.networkSensorUrl ?? getDefaultNetworkSensorUrl();

    const blocked = await detectAdBlock(
      sensor,
      networkSensorUrl,
      options.waitMs ?? DEFAULT_WAIT_MS,
    );

    /*
     * 둘 중 하나라도 차단된 것으로 판단되면
     * 모달을 표시하지 않습니다.
     */
    if (blocked) {
      return;
    }

    showModal(
      options,
      cookieName,
      getMessages(options.lang ?? "auto", options.messages),
    );
  } finally {
    running = false;
  }
}

export function bye_ad(options: ByeAdOptions = {}): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if (document.readyState === "loading") {
    if (queued) {
      return;
    }

    queued = true;

    document.addEventListener(
      "DOMContentLoaded",
      () => {
        queued = false;
        void run(options);
      },
      { once: true },
    );

    return;
  }

  void run(options);
}

export const byeAd = bye_ad;

/*
 * CDN <script> 방식 지원
 *
 * 예:
 * <script src="https://unpkg.com/bye-ad/dist/index.global.js"></script>
 * <script>
 *   bye_ad();
 * </script>
 */
if (typeof window !== "undefined") {
  const win = window as ByeAdWindow;

  win.bye_ad = bye_ad;
  win.byeAd = byeAd;
}
