import { type SVGProps } from 'react';

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = ({ size = 18, ...rest }: IconProps): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  ...rest,
});

export const Logo = (p: IconProps) => (
  <svg {...base({ size: 30, ...p })}>
    <rect x="3" y="3" width="18" height="18" rx="4.5" fill="currentColor" stroke="none" opacity="0.12" />
    <path d="M8 17.5V10l3 2V7.5l2.5 2 2.5-2V17.5" />
    <path d="M8 17h8" />
    <circle cx="17" cy="6.5" r="1.6" fill="currentColor" stroke="none" />
  </svg>
);

export const DashboardIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
  </svg>
);

export const CustomersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19.5c.6-3 2.9-5 5.5-5s4.9 2 5.5 5" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M15.8 14.8c2.2.2 4 1.9 4.7 4.7" />
  </svg>
);

export const ProductsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3 4.5 7v10L12 21l7.5-4V7L12 3Z" />
    <path d="M4.5 7 12 11l7.5-4" />
    <path d="M12 11v10" />
  </svg>
);

export const InventoryIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m12 3 9 4.5-9 4.5L3 7.5 12 3Z" />
    <path d="m3 12 9 4.5L21 12" />
    <path d="m3 16.5 9 4.5 9-4.5" />
  </svg>
);

export const EnquiriesIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 4h15v8.5A6 6 0 0 1 13.5 18.5H8.5L4.5 22v-18Z" />
    <path d="M8.5 8.5h7M8.5 12h7" />
  </svg>
);

export const QuotationsIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4.5" y="3.5" width="15" height="17" rx="1.5" />
    <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />
  </svg>
);

export const SalesOrdersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
    <path d="M9 8.5h6M9 12h6" />
    <path d="m10 15.8 1.4 1.4 2.6-2.8" />
  </svg>
);

export const DispatchesIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 7.5h10.5V16H3V7.5Z" />
    <path d="M13.5 10h4l3 3v3h-7v-6Z" />
    <circle cx="7" cy="18" r="1.8" />
    <circle cx="16.5" cy="18" r="1.8" />
  </svg>
);

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const SignOutIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H9" />
    <path d="M15 8l4 4-4 4M9 12h10" />
  </svg>
);

export const TruckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2.5 6.5h11v9h-11v-9Z" />
    <path d="M13.5 9h3.5l3 3v3.5h-6.5V9Z" />
    <circle cx="6.5" cy="17.5" r="1.6" />
    <circle cx="16" cy="17.5" r="1.6" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const ArrowIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </svg>
);

export const ConvertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 8h12M13 4l4 4-4 4" />
    <path d="M19 16H7M11 20l-4-4 4-4" />
  </svg>
);

export const FactoryIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 21V7.5L4 7l4 2-.5 2H4" />
    <path d="M4 21h16v-9h-6V8h-1.5M4 21h16" />
    <path d="M10 11.5h4M10 15h4M10 18.5h4" />
    <path d="M14 5h1.5v3H14Z" />
    <circle cx="18.8" cy="3.6" r="1.4" />
  </svg>
);

export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 4 2.5 19.5h19L12 4Z" />
    <path d="M12 10v4.5M12 17h.01" />
  </svg>
);

/* Aliases used elsewhere in the app (Icon* convention). */
export const IconDashboard = DashboardIcon;
export const IconCustomers = CustomersIcon;
export const IconProducts = ProductsIcon;
export const IconInventory = InventoryIcon;
export const IconEnquiries = EnquiriesIcon;
export const IconQuotations = QuotationsIcon;
export const IconSalesOrders = SalesOrdersIcon;
export const IconDispatches = DispatchesIcon;
export const IconSignOut = SignOutIcon;
export const IconPlus = PlusIcon;
export const IconSearch = SearchIcon;
export const IconTruck = TruckIcon;
