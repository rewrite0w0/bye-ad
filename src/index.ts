export type Lang = "ko" | "en" | "auto";

export interface ByeAdMessages {
  /** 줄바꿈은 "\n" 또는 "<br>" 사용 (HTML은 렌더링되지 않고 텍스트로 처리됨) */
  description: string;
  ok: string;
  install: string;
}

export interface ByeAdOptions {
  cookieName?: string;
  cookieDays?: number;
  lang?: Lang;
  messages?: Partial<ByeAdMessages>;
  onShow?: () => void;
  onClose?: () => void;
}

interface ResolvedOptions {
  cookieName: string;
  cookieDays: number;
  lang: Lang;
  messages?: Partial<ByeAdMessages>;
  onShow: () => void;
  onClose: () => void;
}

const MESSAGES: Record<"ko" | "en", ByeAdMessages> = {
  ko: {
    description:
      "광고 차단기가 감지되지 않았습니다.\nuBlock Origin을 설치하면 더 빠르고 안전하게 인터넷을 쓸 수 있어요.",
    ok: "OK",
    install: "설치하러 가기",
  },
  en: {
    description:
      "No ad blocker detected.\nInstalling uBlock Origin makes browsing faster and safer.",
    ok: "OK",
    install: "Install",
  },
};

const noop = () => {};

const DEFAULTS = {
  cookieName: "bye-ad-shown",
  cookieDays: 30,
  lang: "auto" as Lang,
};

const MODAL_ID = "bye-ad-modal";
const STYLE_ID = "bye-ad-style";

/** 광고 차단기가 처리할 시간을 주기 위해 100ms 간격으로 최대 8번(≈0.8초) 확인 */
const CHECK_INTERVAL = 100;
const CHECK_COUNT = 8;

const LINKS = {
  firefox: "https://addons.mozilla.org/firefox/addon/ublock-origin/",
  edge: "https://microsoftedge.microsoft.com/addons/detail/ublock-origin/odfafepnkmbhccpbejgmiehpchacaeak",
  // Chrome은 MV3 정책으로 uBlock Origin 대신 uBlock Origin Lite(uBOL)를 사용
  chrome:
    "https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh",
  fallback: "https://ublockorigin.com/",
};

let running = false;

/* -------------------------------------------------------------------------- */
/* utils                                                                      */
/* -------------------------------------------------------------------------- */

function resolveOptions(user: ByeAdOptions): ResolvedOptions {
  // undefined 값이 기본값을 덮어쓰지 않도록 ?? 사용
  return {
    cookieName: user.cookieName ?? DEFAULTS.cookieName,
    cookieDays: user.cookieDays ?? DEFAULTS.cookieDays,
    lang: user.lang ?? DEFAULTS.lang,
    messages: user.messages,
    onShow: user.onShow ?? noop,
    onClose: user.onClose ?? noop,
  };
}

function detectLang(): "ko" | "en" {
  const lang = (navigator.language || "en").toLowerCase();
  return lang.startsWith("ko") ? "ko" : "en";
}

function getMessages(
  lang: Lang,
  custom?: Partial<ByeAdMessages>,
): ByeAdMessages {
  const resolved = lang === "auto" ? detectLang() : lang;
  return { ...MESSAGES[resolved], ...custom };
}

function hasCookie(name: string): boolean {
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${name}=`));
}

function setCookie(name: string, days: number) {
  const secure = location.protocol === "https:" ? ";Secure" : "";
  document.cookie = `${name}=true;path=/;max-age=${Math.round(days * 86400)};SameSite=Lax${secure}`;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 문자열의 "\n" / "<br>" 을 <br> 노드로 변환 (innerHTML 미사용 → XSS 방지) */
function appendText(el: HTMLElement, text: string) {
  text.split(/<br\s*\/?>|\n/i).forEach((line, i) => {
    if (i > 0) el.appendChild(document.createElement("br"));
    el.appendChild(document.createTextNode(line));
  });
}

/* -------------------------------------------------------------------------- */
/* sensor                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * EasyList 등 광고 필터의 cosmetic filter에 걸리는 클래스를 가진 센서 생성
 * (`adsbox`, `adsbygoogle` 등은 대표적인 광고 감지용 클래스)
 */
function createAdSensor(): HTMLDivElement {
  const sensor = document.createElement("div");

  sensor.className =
    "adsbox ad-banner adsbygoogle ad-container advertisement ad-placement";
  sensor.setAttribute("aria-hidden", "true");
  sensor.textContent = "\u00a0";

  sensor.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  `;

  return sensor;
}

/** 센서가 광고 차단기에 의해 숨겨지거나 제거되었는지 확인 */
function isBlocked(sensor: HTMLElement): boolean {
  if (!sensor.isConnected) return true;

  const style = window.getComputedStyle(sensor);
  if (style.display === "none" || style.visibility === "hidden") return true;

  const rect = sensor.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return true;

  // position:absolute 요소는 조상이 display:none이거나 숨겨졌을 때 null
  if (sensor.offsetParent === null) return true;

  return false;
}

async function detectBlocker(sensor: HTMLElement): Promise<boolean> {
  for (let i = 0; i < CHECK_COUNT; i++) {
    await sleep(CHECK_INTERVAL);
    if (isBlocked(sensor)) return true;
  }
  return false;
}

/* -------------------------------------------------------------------------- */
/* modal                                                                      */
/* -------------------------------------------------------------------------- */

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .bye-ad-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .bye-ad-box {
      background: #111;
      color: #fff;
      border: 1px solid #fff;
      padding: 1.5em;
      max-width: 20em;
      text-align: center;
      font: inherit;
      line-height: 1.5;
    }
    .bye-ad-box p { margin: 0 0 1em; }
    .bye-ad-box button {
      margin: 0.25em;
      padding: 0.5em 1em;
      cursor: pointer;
      font: inherit;
    }
  `;
  document.head.appendChild(style);
}

function createModal(messages: ByeAdMessages) {
  const overlay = document.createElement("div");
  overlay.id = MODAL_ID;
  overlay.className = "bye-ad-overlay";

  const box = document.createElement("div");
  box.className = "bye-ad-box";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-describedby", "bye-ad-desc");

  const desc = document.createElement("p");
  desc.id = "bye-ad-desc";
  appendText(desc, messages.description);

  const ok = document.createElement("button");
  ok.type = "button";
  ok.textContent = messages.ok;

  const install = document.createElement("button");
  install.type = "button";
  install.textContent = messages.install;

  box.append(desc, ok, install);
  overlay.appendChild(box);

  return { overlay, ok, install };
}

/**
 * 브라우저별 설치 링크. 설치할 수 없는 환경(모바일 Chrome/Safari 등)은 null
 */
function getBlockerLink(): string | null {
  const ua = navigator.userAgent;

  if (ua.includes("Firefox") && !ua.includes("FxiOS")) return LINKS.firefox;

  // 모바일(iOS 전체, Android의 Firefox 외 브라우저)은 확장 프로그램 설치 불가
  if (/Android|iPhone|iPad|iPod/.test(ua)) return null;

  if (ua.includes("Edg/")) return LINKS.edge;
  if (ua.includes("Chrome")) return LINKS.chrome;

  return LINKS.fallback;
}

function showModal(
  messages: ByeAdMessages,
  link: string,
  options: ResolvedOptions,
) {
  injectStyle();

  const { overlay, ok, install } = createModal(messages);
  const previousFocus = document.activeElement as HTMLElement | null;

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };

  const close = () => {
    document.removeEventListener("keydown", onKeydown);
    overlay.remove();
    previousFocus?.focus?.();
    setCookie(options.cookieName, options.cookieDays);
    options.onClose();
  };

  ok.addEventListener("click", close);

  install.addEventListener("click", () => {
    window.open(link, "_blank", "noopener,noreferrer");
    close();
  });

  // 배경 클릭 시 닫기
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener("keydown", onKeydown);
  document.body.appendChild(overlay);
  ok.focus();

  options.onShow();
}

/* -------------------------------------------------------------------------- */
/* main                                                                       */
/* -------------------------------------------------------------------------- */

async function run(userOptions: ByeAdOptions) {
  if (running || document.getElementById(MODAL_ID)) return;

  const options = resolveOptions(userOptions);
  if (hasCookie(options.cookieName)) return;

  running = true;

  try {
    // 1. 센서 삽입 (모달은 아직 만들지 않음 → 깜빡임/스타일 없는 모달 노출 방지)
    const sensor = createAdSensor();
    document.body.appendChild(sensor);

    // 2. 광고 차단기가 처리할 시간을 주고 확인
    let blocked: boolean;
    try {
      blocked = await detectBlocker(sensor);
    } finally {
      sensor.remove(); // 차단 여부와 관계없이 센서는 항상 정리
    }

    // 3. 차단됨 = 이미 광고 차단기 사용 중 → 아무것도 하지 않음
    if (blocked) return;

    // 4. 설치할 수 없는 환경이면 안내하지 않음
    const link = getBlockerLink();
    if (!link) return;

    // 5. 광고 차단기 없음 → 안내 표시
    showModal(getMessages(options.lang, options.messages), link, options);
  } finally {
    running = false;
  }
}

export function bye_ad(userOptions: ByeAdOptions = {}) {
  // SSR(Next.js 등) 환경 보호
  if (typeof document === "undefined" || typeof window === "undefined") return;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void run(userOptions), {
      once: true,
    });
    return;
  }

  void run(userOptions);
}

/** camelCase 별칭 */
export const byeAd = bye_ad;

/*
 * CDN / UMD
 */
if (typeof window !== "undefined") {
  (window as any).bye_ad = bye_ad;
  (window as any).byeAd = bye_ad;
}
