// index.ts

export type Lang = "ko" | "en" | "auto";

export interface ByeAdMessages {
  description: string;
  ok: string;
  install: string;
}

export interface ByeAdOptions {
  /** 광고 차단기가 숨기는 센서 요소 선택자 */
  sensorSelector?: string;
  /** 모달 요소 선택자 */
  modalSelector?: string;
  /** 쿠키 이름 */
  cookieName?: string;
  /** 쿠키 유지 기간 (일) */
  cookieDays?: number;
  /** true면 기본 스타일을 주입하지 않음 (사용자 스타일 존중) */
  noStyle?: boolean;
  /** 언어 설정 (auto = 브라우저 언어 감지) */
  lang?: Lang;
  /** 메시지 직접 지정 (lang보다 우선) */
  messages?: Partial<ByeAdMessages>;
  onShow?: () => void;
  onClose?: () => void;
}

const MESSAGES: Record<"ko" | "en", ByeAdMessages> = {
  ko: {
    description:
      "광고 차단기가 감지되지 않았습니다.<br>uBlock Origin을 설치하면 더 빠르고 안전하게 인터넷을 쓸 수 있어요.",
    ok: "OK",
    install: "설치하러 가기",
  },
  en: {
    description:
      "No ad blocker detected.<br>Installing uBlock Origin makes browsing faster and safer.",
    ok: "OK",
    install: "Install",
  },
};

const DEFAULTS: Required<Omit<ByeAdOptions, "messages">> = {
  sensorSelector: "#ad-sensor",
  modalSelector: "#ad-note-modal",
  cookieName: "bye-ad-shown",
  cookieDays: 30,
  noStyle: false,
  lang: "auto",
  onShow: () => {},
  onClose: () => {},
};

function detectLang(): "ko" | "en" {
  const lang = (navigator.language || "en").toLowerCase();
  return lang.startsWith("ko") ? "ko" : "en";
}

function getMessages(
  lang: Lang,
  custom?: Partial<ByeAdMessages>,
): ByeAdMessages {
  const resolved = lang === "auto" ? detectLang() : lang;
  return {
    ...MESSAGES[resolved],
    ...custom,
  };
}

function getBlockerLink(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox") || ua.includes("Edg/")) {
    return "https://github.com/gorhill/uBlock#ublock-origin";
  }
  // Chrome, Safari 등 Manifest V3 환경
  return "https://github.com/uBlockOrigin/uBOL-home";
}

function hasCookie(name: string): boolean {
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith(`${name}=`));
}

function setCookie(name: string, days: number) {
  document.cookie = `${name}=true;path=/;max-age=${days * 86400};SameSite=Lax`;
}

function injectDefaultStyle() {
  if (document.getElementById("bye-ad-style")) return;

  const style = document.createElement("style");
  style.id = "bye-ad-style";
  style.textContent = `
    #ad-note-modal {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
    }
    #ad-note-box {
      background: #111111;
      color: white;
      border: white 1px solid;
      padding: 1.5em;
      max-width: 20em;
      text-align: center;
    }
    #ad-note-box button {
      margin: 0.5em;
      padding: 0.5em 1em;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

function applyMessages(messages: ByeAdMessages) {
  const desc = document.querySelector("#ad-note-box p");
  const okBtn = document.getElementById("ad-note-ok");
  const installBtn = document.getElementById("ad-note-install");

  if (desc) desc.innerHTML = messages.description;
  if (okBtn) okBtn.textContent = messages.ok;
  if (installBtn) installBtn.textContent = messages.install;
}

function scheduleCheck(fn: () => void) {
  // 레이아웃/페인트 이후 + 약간의 여유를 두고 검사
  requestAnimationFrame(() => {
    setTimeout(fn, 50);
  });
}

export function bye_ad(userOptions: ByeAdOptions = {}) {
  const options = { ...DEFAULTS, ...userOptions };

  if (hasCookie(options.cookieName)) return;

  scheduleCheck(() => {
    const sensor = document.querySelector(
      options.sensorSelector,
    ) as HTMLElement | null;
    if (!sensor || sensor.offsetParent === null) return;

    if (!options.noStyle) {
      injectDefaultStyle();
    }

    const messages = getMessages(options.lang, options.messages);
    applyMessages(messages);

    const modal = document.querySelector(
      options.modalSelector,
    ) as HTMLElement | null;
    if (!modal) return;

    modal.style.display = "flex";
    options.onShow();

    const close = () => {
      modal.style.display = "none";
      setCookie(options.cookieName, options.cookieDays);
      options.onClose();
    };

    const okBtn = document.getElementById("ad-note-ok");
    const installBtn = document.getElementById("ad-note-install");

    if (okBtn) okBtn.onclick = close;
    if (installBtn) {
      installBtn.onclick = () => {
        window.open(getBlockerLink(), "_blank", "noopener,noreferrer");
        close();
      };
    }
  });
}

// CDN / UMD 지원
if (typeof window !== "undefined") {
  (window as any).bye_ad = bye_ad;
}

export default bye_ad;
