import * as React from 'react';
import { SVGProps } from 'react';

export function PrintIcon({ className = '', color = '#10B981', ...props }: SVGProps<SVGSVGElement> & { color?: string }) {
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
      <rect x="6" y="9" width="12" height="7" rx="2" />
      <path d="M6 17v2a2 2 0 002 2h8a2 2 0 002-2v-2" />
      <path d="M6 7V5a2 2 0 012-2h8a2 2 0 012 2v2" />
    </svg>
  );
}

export default PrintIcon;
