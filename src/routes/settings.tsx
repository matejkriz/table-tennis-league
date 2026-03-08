import { Outlet, createFileRoute } from "@tanstack/react-router";

export const SettingsLayout = () => <Outlet />;

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
});
