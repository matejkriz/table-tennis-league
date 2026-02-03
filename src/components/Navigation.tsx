import { Link } from "@tanstack/react-router";
import {
  IconChartBar,
  IconSettings,
  IconTrophy,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export const Navigation = () => {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Mobile: Fixed bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/10 bg-white md:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-around px-4">
          <Link
            to="/"
            className="relative flex flex-1 flex-col items-center gap-1 py-3 text-black/60 transition-colors hover:text-[#F7931A] active:text-[#F7931A]"
            activeProps={{
              className:
                "relative flex flex-1 flex-col items-center gap-1 py-3 text-[#F7931A] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-12 before:h-0.5 before:bg-[#F7931A] before:rounded-full",
            }}
          >
            <IconTrophy size={24} stroke={1.5} />
            <span className="text-xs font-medium">{t("Match")}</span>
          </Link>

          <Link
            to="/stats"
            className="relative flex flex-1 flex-col items-center gap-1 py-3 text-black/60 transition-colors hover:text-[#F7931A] active:text-[#F7931A]"
            activeProps={{
              className:
                "relative flex flex-1 flex-col items-center gap-1 py-3 text-[#F7931A] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-12 before:h-0.5 before:bg-[#F7931A] before:rounded-full",
            }}
          >
            <IconChartBar size={24} stroke={1.5} />
            <span className="text-xs font-medium">{t("Stats")}</span>
          </Link>

          <Link
            to="/settings"
            className="relative flex flex-1 flex-col items-center gap-1 py-3 text-black/60 transition-colors hover:text-[#F7931A] active:text-[#F7931A]"
            activeProps={{
              className:
                "relative flex flex-1 flex-col items-center gap-1 py-3 text-[#F7931A] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:w-12 before:h-0.5 before:bg-[#F7931A] before:rounded-full",
            }}
          >
            <IconSettings size={24} stroke={1.5} />
            <span className="text-xs font-medium">{t("Settings")}</span>
          </Link>
        </div>
      </nav>

      {/* Desktop: Fixed top navigation with scroll-based background */}
      <nav className="fixed left-0 right-0 top-0 z-50 hidden md:block">
        <div
          className="transition-all duration-300"
          style={{
            backgroundColor: isScrolled
              ? "rgba(255, 255, 255, 0.95)"
              : "transparent",
            backdropFilter: isScrolled ? "blur(8px)" : "none",
            boxShadow: isScrolled
              ? "0 1px 3px 0 rgb(0 0 0 / 0.1)"
              : "none",
            borderBottom: isScrolled
              ? "1px solid rgba(0, 0, 0, 0.1)"
              : "1px solid transparent",
          }}
        >
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <span className="text-lg font-light text-black">
              {t("Table Tennis League")}
            </span>
            <div className="flex items-center gap-8">
              <Link
                to="/"
                className="relative pb-1 text-sm font-medium text-black/60 transition-colors hover:text-[#F7931A]"
                activeProps={{
                  className:
                    "relative pb-1 text-sm font-medium text-[#F7931A] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#F7931A] after:rounded-full",
                }}
              >
                {t("Match")}
              </Link>

              <Link
                to="/stats"
                className="relative pb-1 text-sm font-medium text-black/60 transition-colors hover:text-[#F7931A]"
                activeProps={{
                  className:
                    "relative pb-1 text-sm font-medium text-[#F7931A] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#F7931A] after:rounded-full",
                }}
              >
                {t("Stats")}
              </Link>

              <Link
                to="/settings"
                className="relative pb-1 text-sm font-medium text-black/60 transition-colors hover:text-[#F7931A]"
                activeProps={{
                  className:
                    "relative pb-1 text-sm font-medium text-[#F7931A] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#F7931A] after:rounded-full",
                }}
              >
                {t("Settings")}
              </Link>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};
