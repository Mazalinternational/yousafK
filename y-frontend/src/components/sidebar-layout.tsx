import { motion } from "framer-motion";
import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider } from "./ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { SiteHeader } from "./site-header";
import { Toaster } from "./ui/sonner";

export function SidebarLayout() {
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar variant="inset" />
      <SidebarInset className="h-svh min-h-0 flex-1 overflow-hidden">
        <SiteHeader />
        <Toaster />
        <motion.div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain">
          <Outlet />
        </motion.div>
      </SidebarInset>
    </SidebarProvider>
  );
}
