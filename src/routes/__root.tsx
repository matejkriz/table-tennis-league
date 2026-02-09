import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";

import { Navigation } from "../components/Navigation";
import { EvoluProvider, evolu } from "../evolu/client";
import { PushNotificationsProvider } from "../hooks/usePushNotifications";

const RootComponent = () => {
  const { t } = useTranslation();
  
  return (
    <EvoluProvider value={evolu}>
      <Suspense
        fallback={
          <div className="p-6 text-center text-black/40">{t("Loading…")}</div>
        }
      >
        <PushNotificationsProvider>
          <Navigation />
          <Outlet />
        </PushNotificationsProvider>
      </Suspense>
    </EvoluProvider>
  );
};

export const Route = createRootRoute({
  component: RootComponent,
});
