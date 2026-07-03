import { AppSidebar } from "@/components/layout/AppSidebar";
import { requireStaffUser } from "@/lib/auth/require-staff";

export async function StaffOnlyLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaffUser();
  return (
    <div className="flex min-h-screen">
      <AppSidebar staff={staff} />
      <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
