import { Outlet, createFileRoute } from '@tanstack/solid-router';

import { requireAuthenticatedShell } from '../router-guards';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: requireAuthenticatedShell,
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  return <Outlet />;
}
