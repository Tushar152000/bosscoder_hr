'use client';

import { NODE_W, NODE_H, deptColor } from './types';
import type { OrgTreeNode } from './types';

interface Edge {
  parent: OrgTreeNode;
  child: OrgTreeNode;
}

interface Props {
  edges: Edge[];
  activeDept: string;
  width: number;
  height: number;
}

export function OrgEdges({ edges, activeDept, width, height }: Props) {
  return (
    <svg
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
      width={width}
      height={height}
    >
      {edges.map(({ parent, child }) => {
        const x1 = parent.x + NODE_W / 2;
        const y1 = parent.y + NODE_H;
        const x2 = child.x + NODE_W / 2;
        const y2 = child.y;
        const midY = (y1 + y2) / 2;

        const isActive =
          activeDept !== 'all' &&
          child.department === activeDept &&
          parent.department === activeDept;
        const isFaded =
          activeDept !== 'all' &&
          child.department !== activeDept &&
          parent.id !== '__root__';

        const stroke = isActive ? deptColor(child.department) : '#cbd5e1';
        const strokeWidth = isActive ? 2.5 : 1.5;
        const opacity = isFaded ? 0.1 : 1;

        return (
          <path
            key={`${parent.id}-${child.id}`}
            d={`M ${x1},${y1} C ${x1},${midY} ${x2},${midY} ${x2},${y2}`}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        );
      })}
    </svg>
  );
}
