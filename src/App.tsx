import { MainLayout } from "./components/layout/MainLayout";
import { useAppStore } from "./stores/app-store";

export function App() {
  const settings = useAppStore((state) => state.settings);
  const theme = settings?.theme ?? "green";

  return (
    <div data-theme={theme} className="h-full">
      <MainLayout />
    </div>
  );
}
