'use client';

import {
  Calendar,
  Car,
  CreditCard,
  Home,
  Inbox,
  Search,
  Settings,
  Users,
  Activity,
  LogOut,
  User,
  icons
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { useAuth } from '../lib/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

// Single blue color scheme for all menu items
const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Riders",
    url: "/dashboard/rider",
    icon: Users,
  },
  {
    title: "Drivers", 
    url: "/dashboard/drivers",
    icon: Car,
  },
  {
    title: "Plans & Subscriptions",
    url: "/dashboard/plans",
    icon: CreditCard,
  },
  {
    title: "Bookings",
    url: "/dashboard/booking", 
    icon: Activity,
  },
  {
    title: "Feedback",
    url: "/dashboard/feedback",
    icon: icons.MessageCircle,
  },
];

const settingsItems = [
 
  
];

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // To detect active route

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Sidebar className="border-r border-border/10 shadow-sm">
      {/* Reduced height header - changed from p-4 to p-2 */}
      <SidebarHeader className="border-b border-sidebar-border p-[11px] bg-gradient-to-b from-blue-50 to-white text-sidebar-primary-foreground">
        <div className="flex items-center gap-2"> {/* Reduced gap from gap-3 to gap-2 */}
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-blue-100 shadow-md"> {/* Reduced size from size-10 to size-8, rounded-xl to rounded-lg */}
            <Car className="size-4 text-blue-600" /> {/* Reduced icon size from size-5 to size-4 */}
          </div>
          <div className="flex flex-col gap-0 text-gray-900 leading-tight"> {/* Reduced gap from gap-1 to gap-0, changed leading-none to leading-tight */}
            <span className="font-bold text-base">Link</span> {/* Reduced from text-lg to text-base */}
            <span className="text-xs text-sidebar-foreground/80">Admin Panel</span> {/* Reduced from text-sm to text-xs */}
          </div>
        </div>
      </SidebarHeader>

      {/* Updated SidebarContent with no-scrollbar class */}
      <SidebarContent className="py-4 no-scrollbar overflow-y-auto">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-sm font-medium text-muted-foreground"></SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link 
                        href={item.url} 
                        className={`flex items-center gap-3 rounded-lg px-4 py-2 transition-all duration-200 ease-in-out 
                          ${isActive ? 'bg-blue-100 text-blue-800 shadow-sm' : 'hover:bg-blue-50 hover:shadow-sm text-slate-700'}`}
                      >
                        <item.icon className="size-5 text-blue-600" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Section */}
        <SidebarGroup className="mt-6">
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const isActive = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link 
                        href={item.url} 
                        className={`flex items-center gap-3 rounded-lg px-4 py-2 transition-all duration-200 ease-in-out 
                          ${isActive ? 'bg-blue-100 text-blue-800 shadow-sm' : 'hover:bg-blue-50 hover:shadow-sm text-slate-700'}`}
                      >
                        <item.icon className="size-5 text-blue-600" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 bg-sidebar/50">
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-accent/30 transition-colors">
              <div className="flex aspect-square size-10 items-center justify-center rounded-full bg-sidebar-accent shadow-md">
                <User className="size-5" />
              </div>
              <div className="flex flex-col gap-1 leading-none">
                <span className="text-sm font-semibold truncate max-w-[150px]">
                  {user?.email || 'Admin User'}
                </span>
                <span className="text-xs text-sidebar-foreground/70">Administrator</span>
              </div>
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="w-full justify-start gap-3 py-2 hover:bg-destructive/10 transition-colors">
              <LogOut className="size-5" />
              <span className="font-medium">Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
