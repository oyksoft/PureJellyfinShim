import { Outlet, createFileRoute, useNavigate } from '@tanstack/solid-router';

import { AuthenticatedBootstrapProvider } from '../components/AuthenticatedBootstrap';
import { AUTHENTICATED_HOME_ROUTE, requireAuthenticatedShell } from '../router-guards';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: requireAuthenticatedShell,
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  const navigate = useNavigate();
  return (
    <AuthenticatedBootstrapProvider
      onSessionChange={() => void navigate({ to: AUTHENTICATED_HOME_ROUTE, replace: true })}
    >
      <Outlet />
    </AuthenticatedBootstrapProvider>
  );
}
