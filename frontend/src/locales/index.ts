import zhCN from "./zh-CN.json";
import enUS from "./en-US.json";
import jaJP from "./ja-JP.json";
import koKR from "./ko-KR.json";
import deDE from "./de-DE.json";
import frFR from "./fr-FR.json";
import esES from "./es-ES.json";
import { Locale } from "antd/es/locale";
import zhCNAntd from "antd/locale/zh_CN";
import enUSAntd from "antd/locale/en_US";
import jaJPAntd from "antd/locale/ja_JP";
import koKRAntd from "antd/locale/ko_KR";
import deDEAntd from "antd/locale/de_DE";
import frFRAntd from "antd/locale/fr_FR";
import esESAntd from "antd/locale/es_ES";
import { useAppStore } from "../stores/appStore";

export const messages: Record<string, Record<string, string>> = {
  "zh-CN": zhCN,
  "en-US": enUS,
  "ja-JP": jaJP,
  "ko-KR": koKR,
  "de-DE": deDE,
  "fr-FR": frFR,
  "es-ES": esES,
};

export const localeMap: Record<string, { name: string; nameEn: string; antd: Locale }> = {
  "zh-CN": { name: "简体中文", nameEn: "Chinese", antd: zhCNAntd },
  "en-US": { name: "English", nameEn: "English", antd: enUSAntd },
  "ja-JP": { name: "日本語", nameEn: "Japanese", antd: jaJPAntd },
  "ko-KR": { name: "한국어", nameEn: "Korean", antd: koKRAntd },
  "de-DE": { name: "Deutsch", nameEn: "German", antd: deDEAntd },
  "fr-FR": { name: "Français", nameEn: "French", antd: frFRAntd },
  "es-ES": { name: "Español", nameEn: "Spanish", antd: esESAntd },
};

export function getAntdLocale(lang: string): Locale {
  return localeMap[lang]?.antd ?? enUSAntd;
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
