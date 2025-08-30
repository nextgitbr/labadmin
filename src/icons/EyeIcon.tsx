import * as React from 'react';
import { SVGProps } from 'react';

export function EyeIcon({ className = '', color = '#3B82F6', ...props }: SVGProps<SVGSVGElement> & { color?: string }) {
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
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M1.5 12S5.25 5.25 12 5.25 22.5 12 22.5 12 18.75 18.75 12 18.75 1.5 12 1.5 12z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default EyeIcon;
