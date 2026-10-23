import { useAuth } from "@features/auth";
import type { TopBarUser } from "@shared/components/layout";

export function useRoleDashboard() {
  const { user, role, logout } = useAuth();

  const topBarUser: TopBarUser | null = user ? { name: user.name, role: user.role } : null;

  return { user, role, logout, topBarUser };
}
