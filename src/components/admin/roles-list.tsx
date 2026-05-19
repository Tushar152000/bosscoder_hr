'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, Crown, Briefcase, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/utils';
import { colorForName } from '@/lib/directory/colors';
import { formatDate } from '@/lib/format';
import { ROLE_META } from '@/lib/roles/meta';
import type { Role } from '@/lib/auth/roles';

export interface ListUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  roles: Role[];
  permissions: string[];
  active: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
}

interface Props {
  users: ListUser[];
  currentUid: string;
}

type SortKey = 'last-seen-desc' | 'last-seen-asc' | 'name-asc' | 'name-desc';
type RoleFilter = 'all' | Role | 'none';

function relativeTime(iso: string, now: Date): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return '';
}

const ROLE_ICONS: Record<Role, React.ElementType> = {
  founder: Crown, hr: Briefcase, manager: Users, employee: User,
};

function RolePill({ role }: { role: Role }) {
  const meta = ROLE_META[role];
  const Icon = ROLE_ICONS[role];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium leading-none"
      style={{ background: meta.pillBg, color: meta.pillColor, border: `1px solid ${meta.pillColor}22` }}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" />
      {meta.label}
    </span>
  );
}

export function RolesList({ users, currentUid }: Props) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [sort, setSort] = useState<SortKey>('last-seen-desc');
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const founderCount = users.filter((u) => u.roles.includes('founder')).length;
  const hrCount = users.filter((u) => u.roles.includes('hr')).length;
  const managerCount = users.filter((u) => u.roles.includes('manager')).length;
  const employeeCount = users.filter((u) => !u.roles.some((r) => r !== 'employee')).length;

  const filtered = useMemo(() => {
    let list = [...users];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.displayName?.toLowerCase().includes(q) ?? false)
      );
    }
    if (roleFilter !== 'all') {
      if (roleFilter === 'none') {
        list = list.filter((u) => !u.roles.some((r) => r !== 'employee'));
      } else {
        list = list.filter((u) => u.roles.includes(roleFilter));
      }
    }
    list.sort((a, b) => {
      const aT = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
      const bT = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      if (sort === 'last-seen-desc') return bT - aT;
      if (sort === 'last-seen-asc') return aT - bT;
      const aName = (a.displayName || a.email).toLowerCase();
      const bName = (b.displayName || b.email).toLowerCase();
      if (sort === 'name-asc') return aName.localeCompare(bName);
      return bName.localeCompare(aName);
    });
    return list;
  }, [users, search, roleFilter, sort]);

  const inputCls =
    'h-8 rounded-md border border-slate-200 bg-white px-2.5 text-[12px] text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20 focus:border-[#0C447C]/50 transition';

  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
        {[
          { role: 'founder' as Role, count: founderCount },
          { role: 'hr' as Role, count: hrCount },
          { role: 'manager' as Role, count: managerCount },
          { role: 'employee' as Role, count: employeeCount, label: 'Employees' },
        ].map(({ role, count, label }) => {
          const meta = ROLE_META[role];
          const Icon = ROLE_ICONS[role];
          return (
            <div
              key={role}
              className="bg-white border border-slate-200 rounded-md p-3 shadow-sm cursor-pointer hover:border-slate-300 transition"
              onClick={() => setRoleFilter(roleFilter === role ? 'all' : role)}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <div
                  className="w-5 h-5 rounded-[5px] flex items-center justify-center shrink-0"
                  style={{ background: meta.pillBg }}
                >
                  <Icon className="h-[11px] w-[11px]" style={{ color: meta.pillColor }} />
                </div>
                <span className="text-[10px] font-medium tracking-[0.5px] uppercase text-slate-400">
                  {label ?? meta.label}
                </span>
              </div>
              <p className="text-[18px] font-medium text-slate-900">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Table card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Header bar */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[13px] font-medium text-slate-900">Portal users</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {users.length} user{users.length !== 1 ? 's' : ''} · auto-created on first sign-in with @bosscoderacademy.com
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(inputCls, 'pl-6 w-[180px]')}
              />
            </div>
            {/* Role filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className={cn(inputCls, 'pr-7')}
            >
              <option value="all">All roles</option>
              <option value="founder">Founder</option>
              <option value="hr">HR</option>
              <option value="manager">Manager</option>
              <option value="none">Employee only</option>
            </select>
            {/* Sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className={cn(inputCls, 'pr-7')}
            >
              <option value="last-seen-desc">Last seen, newest</option>
              <option value="last-seen-asc">Last seen, oldest</option>
              <option value="name-asc">Name A → Z</option>
              <option value="name-desc">Name Z → A</option>
            </select>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          {/* Col headers */}
          <div className="grid grid-cols-[1.7fr_1.4fr_0.5fr_0.8fr_0.3fr] gap-2.5 px-4 py-2.5 bg-[#F4F7FA] border-b border-slate-100 text-[10px] font-medium tracking-[0.5px] uppercase text-slate-400">
            <span>User</span>
            <span>Roles</span>
            <span>Perms</span>
            <span>Last seen</span>
            <span />
          </div>
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-[12px] text-slate-400 text-center">No users match.</p>
          ) : (
            filtered.map((u) => (
              <Link
                key={u.uid}
                href={`/admin/roles/${u.uid}`}
                className={cn(
                  'grid grid-cols-[1.7fr_1.4fr_0.5fr_0.8fr_0.3fr] gap-2.5 px-4 py-2.5 items-center border-b border-slate-100 last:border-0 hover:bg-[#F4F7FA] transition-colors',
                  !u.active && 'opacity-65'
                )}
              >
                {/* User */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar user={u} size={28} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          'text-[12px] font-medium text-slate-900',
                          !u.active && 'line-through'
                        )}
                      >
                        {u.displayName ?? u.email.split('@')[0]}
                      </span>
                      {u.uid === currentUid && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-[#E6F1FB] text-[#0C447C]">
                          You
                        </span>
                      )}
                      {!u.active && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-[#FAEEDA] text-[#854F0B]">
                          Deactivated
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                  </div>
                </div>
                {/* Roles */}
                <div className="flex flex-wrap gap-1">
                  {u.roles.length === 0 ? (
                    <span className="text-[10px] text-slate-400">—</span>
                  ) : (
                    u.roles.map((r) => <RolePill key={r} role={r} />)
                  )}
                </div>
                {/* Perms */}
                <span
                  className={cn(
                    'text-[12px]',
                    u.permissions.length > 0 ? 'font-medium text-slate-900' : 'text-slate-400'
                  )}
                >
                  {u.permissions.length}/7
                </span>
                {/* Last seen */}
                <div>
                  {u.uid === currentUid ? (
                    <p className="text-[11px] font-medium text-emerald-600">Active</p>
                  ) : u.lastLoginAt ? (
                    <>
                      <p className="text-[11px] text-slate-900">
                        {formatDate(new Date(u.lastLoginAt))}
                      </p>
                      {now && (
                        <p className="text-[10px] text-slate-500">
                          {relativeTime(u.lastLoginAt, now)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-400">Never</p>
                  )}
                </div>
                {/* Chevron */}
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 justify-self-end" />
              </Link>
            ))
          )}
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-[12px] text-slate-400 text-center">No users match.</p>
          ) : (
            filtered.map((u) => (
              <Link
                key={u.uid}
                href={`/admin/roles/${u.uid}`}
                className={cn(
                  'flex flex-col gap-2 px-4 py-3 hover:bg-[#F4F7FA] transition-colors',
                  !u.active && 'opacity-65'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Avatar user={u} size={28} />
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span
                      className={cn(
                        'text-[12px] font-medium text-slate-900',
                        !u.active && 'line-through'
                      )}
                    >
                      {u.displayName ?? u.email.split('@')[0]}
                    </span>
                    {u.uid === currentUid && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-[#E6F1FB] text-[#0C447C]">
                        You
                      </span>
                    )}
                    {!u.active && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-[#FAEEDA] text-[#854F0B]">
                        Deactivated
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 pl-9">
                  {u.roles.length === 0 ? (
                    <span className="text-[10px] text-slate-400">No elevated role</span>
                  ) : (
                    u.roles.map((r) => <RolePill key={r} role={r} />)
                  )}
                </div>
                <div className="flex items-center justify-between pl-9">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-500">
                      {u.permissions.length}/7 permissions
                    </span>
                    {u.lastLoginAt && now && (
                      <span className="text-[11px] text-slate-400">
                        {relativeTime(u.lastLoginAt, now) || formatDate(new Date(u.lastLoginAt))}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function Avatar({ user, size }: { user: ListUser; size: number }) {
  const bg = colorForName(user.displayName ?? user.email);
  const label = initials(user.displayName, user.email);
  const sz = `${size}px`;

  if (user.photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.photoURL}
        alt=""
        referrerPolicy="no-referrer"
        className="rounded-full object-cover shrink-0"
        style={{ width: sz, height: sz }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 text-white font-medium"
      style={{ width: sz, height: sz, background: bg, fontSize: Math.round(size * 0.38) }}
    >
      {label}
    </div>
  );
}
