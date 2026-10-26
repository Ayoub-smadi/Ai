import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type SocialIcon = "facebook" | "instagram" | "linkedin" | "youtube" | "website";
export type SocialLink = { id: string; label: string; url: string; icon: SocialIcon };
export type HeroMotionIcon = "sprout" | "garden" | "care";
export type HeroMotionScene = {
  id: string;
  icon: HeroMotionIcon;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
};
export type AdminSettings = {
  brandNameEn: string;
  brandNameAr: string;
  phone: string;
  primaryColor: string;
  logoUrl: string;
  heroTitleEn: string;
  heroTitleAr: string;
  heroDescriptionEn: string;
  heroDescriptionAr: string;
  heroMotionEnabled: boolean;
  heroMotionScenes: HeroMotionScene[];
  socialLinks: SocialLink[];
};
export type SettingsSaveState = "loading" | "saved" | "saving" | "error";

export const defaultHeroMotionScenes: HeroMotionScene[] = [
  { id: "project", icon: "sprout", titleEn: "Starting an agricultural project?", titleAr: "عندك مشروع زراعي؟", descriptionEn: "Let’s turn your idea into a clear growing plan.", descriptionAr: "نحوّل فكرتك إلى بداية واضحة وخطة نموّ." },
  { id: "garden", icon: "garden", titleEn: "Ready to plant your garden?", titleAr: "عندك حديقة وبدك تزرعها؟", descriptionEn: "Choose the right plants and make every corner bloom.", descriptionAr: "نختار معك النباتات المناسبة ونرتّب خطوات الزراعة." },
  { id: "care", icon: "care", titleEn: "Is your plant looking unwell?", titleAr: "نبتتك تعبانة وبدها عناية؟", descriptionEn: "Understand what it needs and help it thrive again.", descriptionAr: "نساعدك تعرف احتياجها وتعتني فيها بطريقة أفضل." },
];

export const defaultAdminSettings: AdminSettings = {
  brandNameEn: "QADRI AI",
  brandNameAr: "قادري AI",
  phone: "0777772211",
  primaryColor: "#020618",
  logoUrl: "/chatbot.png",
  heroTitleEn: "Customer care\nthat knows\nyour business.",
  heroTitleAr: "خدمة عملاء\nتعرف عملك.",
  heroDescriptionEn: "Build a bilingual AI agent that answers from your real products, policies, and approved answers.",
  heroDescriptionAr: "أنشئ وكيلاً ذكياً ثنائي اللغة يجيب من منتجاتك وسياساتك وإجاباتك المعتمدة.",
  heroMotionEnabled: true,
  heroMotionScenes: defaultHeroMotionScenes,
  socialLinks: [],
};

type SettingsContextValue = {
  settings: AdminSettings;
  update: (patch: Partial<AdminSettings>) => void;
  saveState: SettingsSaveState;
};

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaultAdminSettings,
  update: () => undefined,
  saveState: "loading",
});

function normalizeSettings(value: unknown): AdminSettings {
  if (!value || typeof value !== "object") return defaultAdminSettings;
  const source = value as Partial<AdminSettings>;
  return {
    ...defaultAdminSettings,
    ...source,
    heroMotionScenes: Array.isArray(source.heroMotionScenes) && source.heroMotionScenes.length
      ? source.heroMotionScenes
      : defaultHeroMotionScenes,
    socialLinks: Array.isArray(source.socialLinks) ? source.socialLinks : [],
  };
}

export function AdminSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AdminSettings>(defaultAdminSettings);
  const [saveState, setSaveState] = useState<SettingsSaveState>("loading");
  const settingsRef = useRef(settings);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRevision = useRef(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/site/settings", { credentials: "same-origin" });
        if (!response.ok) throw new Error("Site settings could not be loaded.");
        const result = await response.json() as { settings?: unknown } | unknown;
        const raw = result && typeof result === "object" && "settings" in result
          ? (result as { settings: unknown }).settings
          : result;
        const loaded = normalizeSettings(raw);
        if (!active) return;
        settingsRef.current = loaded;
        setSettings(loaded);
        setSaveState("saved");
      } catch {
        if (active) setSaveState("error");
      }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const update = useCallback((patch: Partial<AdminSettings>) => {
    const next = normalizeSettings({ ...settingsRef.current, ...patch });
    settingsRef.current = next;
    setSettings(next);
    setSaveState("saving");
    saveRevision.current += 1;
    const currentRevision = saveRevision.current;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch("/api/admin/site-settings", {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json", "X-App-Request": "1" },
            body: JSON.stringify(next),
          });
          if (!response.ok) throw new Error("Site settings could not be saved.");
          if (currentRevision === saveRevision.current) setSaveState("saved");
        } catch {
          if (currentRevision === saveRevision.current) setSaveState("error");
        }
      })();
    }, 650);
  }, []);

  return <SettingsContext.Provider value={{ settings, update, saveState }}>{children}</SettingsContext.Provider>;
}

export function useAdminSettings() {
  return useContext(SettingsContext);
}
