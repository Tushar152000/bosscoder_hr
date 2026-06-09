'use client';

import { initials } from '@/lib/utils';

interface BirthdayPerson {
  id: string;
  name: string;
  department?: string;
}

interface BirthdayBannerProps {
  people: BirthdayPerson[];
}

const AVATAR_COLORS = [
  { bg: '#e6f1fb', color: '#0c447c' },
  { bg: '#faeeda', color: '#633806' },
  { bg: '#e1f5ee', color: '#085041' },
  { bg: '#eeedfe', color: '#3c3489' },
];

export function BirthdayBanner({ people }: BirthdayBannerProps) {
  if (people.length === 0) return null;

  const names = people.map((p) => p.name.split(' ')[0]).join(' & ');

  return (
    <div className="flex items-center gap-3 bg-white border border-pink-200 rounded-2xl px-4 py-3 ">
      <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
        <span className="text-lg">🎂</span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-pink-800">Birthdays today</p>
        <p className="text-xs text-pink-600 mt-0.5">
          {names} {people.length === 1 ? 'is' : 'are'} celebrating today
        </p>
      </div>

      <div className="flex items-center mr-1">
        {people.slice(0, 3).map((p, i) => {
          const c = AVATAR_COLORS[i % AVATAR_COLORS.length];
          return (
            <div
              key={p.id}
              className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium"
              style={{
                background: c.bg,
                color: c.color,
                marginLeft: i === 0 ? 0 : -6,
                zIndex: people.length - i,
              }}
            >
              {initials(p.name, '')}
            </div>
          );
        })}
        {people.length > 3 && (
          <div
            className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium bg-gray-100 text-gray-500"
            style={{ marginLeft: -6 }}
          >
            +{people.length - 3}
          </div>
        )}
      </div>
    </div>
  );
}
