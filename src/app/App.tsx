import { lazy, Suspense, type ReactNode } from "react";
import { createHashRouter, Navigate, RouterProvider } from "react-router";
import { AppShell } from "@/features/shell/AppShell";
import { RouteError } from "@/features/shell/RouteError";
import { OverviewPage } from "@/features/overview/OverviewPage";
import { ExpensesPage } from "@/features/expenses/ExpensesPage";

// Overview and Expenses are used every day and load with the app; the rest load when opened.
const HistoryPage = lazy(() => import("@/features/history/HistoryPage").then((m) => ({ default: m.HistoryPage })));
const CategoriesPage = lazy(() =>
  import("@/features/categories/CategoriesPage").then((m) => ({ default: m.CategoriesPage })),
);
const TemplatesPage = lazy(() =>
  import("@/features/templates/TemplatesPage").then((m) => ({ default: m.TemplatesPage })),
);
const SettingsPage = lazy(() => import("@/features/settings/SettingsPage").then((m) => ({ default: m.SettingsPage })));

const page = (el: ReactNode) => (
  <Suspense fallback={<div aria-busy="true" aria-label="Loading" className="h-64 animate-pulse rounded-xl bg-surface-muted" />}>
    {el}
  </Suspense>
);

const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "overview", element: <OverviewPage /> },
      { path: "expenses", element: <ExpensesPage /> },
      { path: "history", element: page(<HistoryPage />) },
      { path: "categories", element: page(<CategoriesPage />) },
      { path: "templates", element: page(<TemplatesPage />) },
      { path: "settings", element: page(<SettingsPage />) },
      { path: "*", element: <Navigate to="/overview" replace /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
