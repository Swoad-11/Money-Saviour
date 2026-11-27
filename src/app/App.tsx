import { createHashRouter, Navigate, RouterProvider } from "react-router";
import { AppShell } from "@/features/shell/AppShell";
import { OverviewPage } from "@/features/overview/OverviewPage";
import { ExpensesPage } from "@/features/expenses/ExpensesPage";
import { HistoryPage } from "@/features/history/HistoryPage";
import { CategoriesPage } from "@/features/categories/CategoriesPage";
import { TemplatesPage } from "@/features/templates/TemplatesPage";
import { SettingsPage } from "@/features/settings/SettingsPage";

const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "overview", element: <OverviewPage /> },
      { path: "expenses", element: <ExpensesPage /> },
      { path: "history", element: <HistoryPage /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "templates", element: <TemplatesPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <Navigate to="/overview" replace /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
