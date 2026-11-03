import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    focusable: false,
    ...props,
  };
}

export const ArrowUpRight = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

export const ArrowRight = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const Cart = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 8H6" />
    <circle cx="10" cy="20" r="1.4" />
    <circle cx="18" cy="20" r="1.4" />
  </svg>
);

export const UserIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
  </svg>
);

export const MenuIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 8h16M4 16h16" />
  </svg>
);

export const Close = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const Check = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m4 12.5 5 5L20 6.5" />
  </svg>
);

export const Plus = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const Minus = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M5 12h14" />
  </svg>
);

export const Trash = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </svg>
);

export const Whatsapp = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M20.5 11.7a8.4 8.4 0 0 1-12.3 7.5L4 20.5l1.3-4.1A8.4 8.4 0 1 1 20.5 11.7Z" />
    <path d="M8.9 8.4c.3-.1.6 0 .8.3l.8 1.3c.1.2.1.5 0 .7l-.5.6c-.1.2-.2.4-.1.6.4.9 1.4 1.8 2.3 2.2.2.1.4.1.6-.1l.6-.6c.2-.2.4-.2.6-.1l1.4.7c.3.2.4.5.3.8-.3.9-1.1 1.5-2.1 1.4-2.9-.3-5.4-2.8-5.8-5.7-.1-.9.5-1.7 1.1-2.1Z" />
  </svg>
);

export const MapPin = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.6" />
  </svg>
);

export const PhoneIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6 3h3l1.6 4-2 1.4a12 12 0 0 0 5 5L15 11.4 19 13v3a2 2 0 0 1-2.2 2A15.4 15.4 0 0 1 4 5.2 2 2 0 0 1 6 3Z" />
  </svg>
);

export const Clock = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const Mail = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

export const Instagram = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17" cy="7" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

export const TikTok = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M14 4v9.5a3.5 3.5 0 1 1-3.2-3.5" />
    <path d="M14 4c.3 2.4 2 4 4.4 4.2" />
  </svg>
);

export const XIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 4l16 16M20 4 4 20" />
  </svg>
);

export const Sparkle = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
  </svg>
);

export const Star = (props: IconProps) => (
  <svg {...base({ ...props, fill: 'currentColor', stroke: 'none' })}>
    <path d="M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.8-5.1 2.8 1-5.7-4.1-4 5.7-.8L12 3.6Z" />
  </svg>
);

export const HomeIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 10.5 12 4l8 6.5V20H4v-9.5Z" />
    <path d="M9.5 20v-5.5h5V20" />
  </svg>
);

export const BagIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M5 8h14l-1.2 12H6.2L5 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
);

export const Layout = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.4" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.4" />
  </svg>
);

export const Logout = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M15 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h9M14 12h7m-3-3 3 3-3 3" />
  </svg>
);
