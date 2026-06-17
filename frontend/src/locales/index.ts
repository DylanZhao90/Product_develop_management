import zhCN from "./zh-CN.json";
import enUS from "./en-US.json";
import { Locale } from "antd/es/locale";
import zhCNAntd from "antd/locale/zh_CN";
import enUSAntd from "antd/locale/en_US";
import { useAppStore } from "../stores/appStore";

export const messages: Record<string, Record<string, string>> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

export function getAntdLocale(lang: string): Locale {
  return lang === "zh-CN" ? zhCNAntd : enUSAntd;
}

export function useLocale() {
  const lang = useAppStore((s) => s.language);
  const t = (key: string, params?: Record<string, string | number>) => {
    let text = messages[lang]?.[key] || messages["zh-CN"]?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  };
  return { t, lang };
}
