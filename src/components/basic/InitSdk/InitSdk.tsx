import React, { useEffect, useMemo, useState } from "react";
import { SdkContext } from "contexts";
import { FatNotesPluginSDK } from "fat-notes-sdk";
import { IntlProvider } from "react-intl";
import cn from "../../../locales/zh_CN";
import en from "../../../locales/en_US";

interface InitSdkProps {
  sdk: FatNotesPluginSDK | undefined;
  children?: React.ReactNode;
}

const DEFAULT_LOCALE = "zh_CN";

const normalizeLocale = (locale?: string) => {
  if (!locale) {
    return DEFAULT_LOCALE;
  }
  const normalizedLocale = locale.replace("-", "_");
  if (normalizedLocale === "zh_CN" || normalizedLocale.startsWith("zh")) {
    return "zh_CN";
  }
  if (normalizedLocale === "en_US" || normalizedLocale.startsWith("en")) {
    return "en_US";
  }
  return DEFAULT_LOCALE;
};

const LANG_MAP: Record<string, Record<string, string>> = {
  zh_CN: cn,
  en_US: en,
};

const InitSdk = (props: InitSdkProps) => {
  const { sdk, children } = props;
  const [locale, setLocale] = useState(() =>
    normalizeLocale(sdk?.ui.i18n.locale),
  );
  const [hostMessages, setHostMessages] = useState<Record<string, string>>(
    () => {
      try {
        return sdk?.ui.i18n.getMessages() || {};
      } catch {
        return {};
      }
    },
  );

  useEffect(() => {
    if (!sdk) {
      return;
    }
    const applyLocale = (nextLocale: string) => {
      const normalized = normalizeLocale(nextLocale);
      setLocale(normalized);
      try {
        setHostMessages(sdk.ui.i18n.getMessages() || {});
      } catch {
        setHostMessages({});
      }
    };
    applyLocale(sdk.ui.i18n.locale);
    const disposable = sdk.ui.i18n.onChange(applyLocale);
    return () => disposable.dispose();
  }, [sdk]);

  const messages = useMemo(() => {
    const pluginMessages = LANG_MAP[locale] || LANG_MAP[DEFAULT_LOCALE];
    return { ...hostMessages, ...pluginMessages };
  }, [hostMessages, locale]);

  return sdk ? (
    <IntlProvider locale={locale.replace("_", "-")} messages={messages}>
      <SdkContext.Provider value={{ sdk }}>{children}</SdkContext.Provider>
    </IntlProvider>
  ) : null;
};

export default InitSdk;
