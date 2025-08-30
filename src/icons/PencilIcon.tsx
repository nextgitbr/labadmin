import * as React from 'react';
import { SVGProps } from 'react';

export function PencilIcon({ className = '', color = '#F59E0B', ...props }: SVGProps<SVGSVGElement> & { color?: string }) {
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
        d="M16.862 5.487l1.65 1.65a1.5 1.5 0 010 2.121l-8.486 8.485a1.5 1.5 0 01-1.06.439H5.25v-3.515a1.5 1.5 0 01.439-1.06l8.485-8.485a1.5 1.5 0 012.121 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      />
    </svg>
  );
}

export default PencilIcon;
