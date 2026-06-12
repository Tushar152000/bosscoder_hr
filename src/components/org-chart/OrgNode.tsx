'use client';

import { useState } from 'react';
import { NODE_W, deptColor } from './types';
import type { OrgTreeNode } from './types';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const SHADOWS = [
  '0 8px 32px rgba(12,68,124,0.18)',
  '0 4px 16px rgba(0,0,0,0.10)',
  '0 2px 8px rgba(0,0,0,0.07)',
];

function shadowFor(level: number, boosted: boolean): string {
  const idx = Math.min(level - 1, SHADOWS.length - 1);
  return boosted ? SHADOWS[Math.max(0, idx - 1)] : SHADOWS[idx];
}

interface Props {
  node: OrgTreeNode;
  isDimmed: boolean;
  isSearchMatch: boolean;
}

export function OrgNode({ node, isDimmed, isSearchMatch }: Props) {
  const [hovered, setHovered] = useState(false);
  const color = deptColor(node.department);
  const colorBg = `${color}1a`;

  const card: React.CSSProperties = {
    position: 'absolute',
    left: node.x,
    top: node.y,
    width: NODE_W,
    minHeight: 88,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: isSearchMatch
      ? `2.5px solid ${color}`
      : hovered
      ? '1.5px solid #0C447C'
      : '1px solid #e2e8f0',
    boxShadow: isSearchMatch
      ? `${shadowFor(node.level, false)}, 0 0 0 4px ${color}33`
      : shadowFor(node.level, hovered),
    opacity: isDimmed ? 0.15 : 1,
    transform: isDimmed ? 'scale(0.93)' : hovered ? 'scale(1.04)' : 'scale(1)',
    transition: 'opacity 200ms ease, transform 200ms ease, box-shadow 150ms ease, border-color 150ms ease',
    cursor: 'default',
    display: 'flex',
    overflow: 'hidden',
    userSelect: 'none',
  };

  return (
    <div
      style={card}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left colour strip */}
      <div style={{ width: 4, backgroundColor: color, flexShrink: 0 }} />

      {/* Body */}
      <div style={{ padding: '10px 10px 10px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
        {/* Avatar + name/role row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          {node.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={node.avatarUrl}
              alt={node.name}
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                flexShrink: 0,
                letterSpacing: '0.03em',
              }}
            >
              {initials(node.name)}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#1e293b',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={node.name}
            >
              {node.name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#64748b',
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={node.role}
            >
              {node.role}
            </div>
          </div>
        </div>

        {/* Department chip */}
        <div
          style={{
            alignSelf: 'flex-start',
            fontSize: 10,
            fontWeight: 600,
            color,
            backgroundColor: colorBg,
            borderRadius: 999,
            padding: '2px 8px',
            lineHeight: 1.5,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}
        >
          {node.department}
        </div>
      </div>
    </div>
  );
}
