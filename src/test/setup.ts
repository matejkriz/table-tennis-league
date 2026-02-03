import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "fake-indexeddb/auto";

// Mock i18next to return keys as-is (English behavior)
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
  initReactI18next: {
    type: "3rdParty",
    init: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
});
