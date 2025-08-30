import * as React from 'react';
import { SVGProps } from 'react';

export function TrashIcon({ className = '', color = '#EF4444', ...props }: SVGProps<SVGSVGElement> & { color?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      style={{ color, ...props.style }}
      aria-hidden="true"
    >
      <path
        d="M6 7h12M9 7v10m6-10v10M4 7h16M4 7v10a2 2 0 002 2h8a2 2 0 002-2V7"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
}

export default TrashIcon;
