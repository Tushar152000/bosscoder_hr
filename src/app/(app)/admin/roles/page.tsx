import { redirect } from 'next/navigation';

/** Role management now lives under Settings; keep old links working. */
export default function RolesRedirect() {
  redirect('/settings/roles');
}
