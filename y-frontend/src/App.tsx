import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./contexts/theme-provider";
import { createBrowserRouter, RouterProvider } from "react-router";
import { routes } from "./routes";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { SeasonScopeProvider } from "@/features/admin/seasons/SeasonScopeProvider";

function App() {
  const queryClient = new QueryClient();
  const routesObject = createBrowserRouter(routes);
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          <AuthProvider>
            <SeasonScopeProvider>
              <RouterProvider router={routesObject} />
            </SeasonScopeProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
