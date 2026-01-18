'use client';

import { usePathname } from 'next/navigation';
import { AdminHeader } from '@/components/admin';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  // Login page has its own full-page layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="admin-layout">
      <AdminHeader />
      <main className="admin-main">
        <div className="container-wide py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
