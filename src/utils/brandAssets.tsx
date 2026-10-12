import React from 'react';
import { BillingTheme, PandiyanBillingTheme } from '../types';

/**
 * High-resolution SVG Logos and Stamps for Spider Grid Solutions and Pandiyan Computers
 */

// SGS High-Tech Vector Logo (SVG Data URL)
export const DEFAULT_SGS_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="400" height="120">
  <defs>
    <linearGradient id="sgsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#1e3a8a" />
    </linearGradient>
    <linearGradient id="sgsAcc" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#60a5fa" />
    </linearGradient>
  </defs>
  
  <!-- Cyber Hexagon Shield -->
  <g transform="translate(15, 10)">
    <polygon points="50,5 90,28 90,72 50,95 10,72 10,28" fill="url(#sgsGrad)" stroke="#38bdf8" stroke-width="3" stroke-linejoin="round" />
    <polygon points="50,15 82,33 82,67 50,85 18,67 18,33" fill="#0f172a" opacity="0.4" />
    <!-- Spider Web & Circuit Traces -->
    <path d="M50,15 L50,85 M18,33 L82,67 M18,67 L82,33" stroke="#38bdf8" stroke-width="1.5" opacity="0.6" />
    <circle cx="50" cy="50" r="14" fill="#0284c7" stroke="#ffffff" stroke-width="2" />
    <!-- Monogram Core -->
    <text x="50" y="55" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="900" fill="#ffffff" text-anchor="middle">SGS</text>
  </g>

  <!-- Typography -->
  <g transform="translate(130, 22)">
    <text x="0" y="32" font-family="system-ui, -apple-system, sans-serif" font-size="25" font-weight="900" fill="#0f172a" letter-spacing="1.2">SPIDER GRID</text>
    <text x="0" y="56" font-family="system-ui, -apple-system, sans-serif" font-size="19" font-weight="800" fill="#0284c7" letter-spacing="3.5">SOLUTIONS</text>
    <rect x="0" y="66" width="245" height="2" fill="url(#sgsAcc)" rx="1" />
    <text x="0" y="82" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" fill="#64748b" letter-spacing="1.5">CHIP-LEVEL SERVICE · IT NETWORKING · CCTV · SALES</text>
    <text x="0" y="93" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="600" fill="#94a3b8" letter-spacing="0.5">MADURAI · GSTIN: 33AAAAA0000A1Z5</text>
  </g>
</svg>
`)}`;

// SGS Official Rubber Stamp Seal (Circular Violet/Blue Seal)
export const DEFAULT_SGS_STAMP_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
  <defs>
    <!-- Circular Path for Text -->
    <path id="circleTop" d="M 40,160 A 120,120 0 1,1 280,160" fill="none" />
    <path id="circleBottom" d="M 280,160 A 120,120 0 0,1 40,160" fill="none" />
  </defs>

  <g transform="rotate(-6 160 160)">
    <!-- Outer Double Border -->
    <circle cx="160" cy="160" r="148" fill="none" stroke="#2563eb" stroke-width="4.5" stroke-dasharray="1000 0" opacity="0.88" />
    <circle cx="160" cy="160" r="141" fill="none" stroke="#2563eb" stroke-width="1.8" opacity="0.82" />
    <circle cx="160" cy="160" r="95" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="4 2" opacity="0.75" />

    <!-- Circular Top Text -->
    <text fill="#2563eb" font-family="system-ui, -apple-system, sans-serif" font-size="16.5" font-weight="900" letter-spacing="3" opacity="0.92">
      <textPath href="#circleTop" startOffset="50%" text-anchor="middle">
        ★ SPIDER GRID SOLUTIONS ★
      </textPath>
    </text>

    <!-- Circular Bottom Text -->
    <text fill="#2563eb" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="800" letter-spacing="2.2" opacity="0.92">
      <textPath href="#circleBottom" startOffset="50%" text-anchor="middle">
        MADURAI · TAMIL NADU · 625001
      </textPath>
    </text>

    <!-- Center Seal Content -->
    <g transform="translate(160, 160)" text-anchor="middle">
      <circle cx="0" cy="0" r="48" fill="#eff6ff" opacity="0.4" />
      <text y="-20" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="800" fill="#1d4ed8" letter-spacing="1">REGD. WORKSHOP</text>
      <text y="-2" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#1e40af" letter-spacing="1.5">SGS SERVICE</text>
      <line x1="-50" y1="6" x2="50" y2="6" stroke="#2563eb" stroke-width="1.5" />
      <text y="20" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" fill="#2563eb">GST VERIFIED</text>
      <text y="32" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="800" fill="#1e40af">AUTH. SIGNATORY</text>
    </g>
  </g>
</svg>
`)}`;

// Pandiyan Computers Heritage Vector Logo (SVG Data URL)
export const DEFAULT_PANDIYAN_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120" width="400" height="120">
  <defs>
    <linearGradient id="pandiyanGold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b45309" />
      <stop offset="50%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#78350f" />
    </linearGradient>
    <linearGradient id="rubyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#b91c1c" />
      <stop offset="100%" stop-color="#dc2626" />
    </linearGradient>
  </defs>

  <!-- Royal Pandiyan Emblem Badge -->
  <g transform="translate(15, 10)">
    <rect x="5" y="5" width="85" height="90" rx="16" fill="url(#pandiyanGold)" stroke="#fef3c7" stroke-width="2.5" />
    <rect x="10" y="10" width="75" height="80" rx="12" fill="#451a03" opacity="0.6" />
    <!-- Royal Crown & PC Monogram -->
    <path d="M26,38 L32,24 L48,34 L63,24 L70,38 Z" fill="#fbbf24" stroke="#f59e0b" stroke-width="1.5" />
    <circle cx="48" cy="46" r="3" fill="#ffffff" />
    <text x="48" y="74" font-family="serif, Georgia, Times" font-size="28" font-weight="900" fill="#fef3c7" text-anchor="middle" letter-spacing="1">PC</text>
    <text x="48" y="84" font-family="system-ui, -apple-system, sans-serif" font-size="7" font-weight="800" fill="#fde68a" text-anchor="middle" letter-spacing="1.5">ESTD 2018</text>
  </g>

  <!-- Typography -->
  <g transform="translate(125, 20)">
    <text x="0" y="32" font-family="serif, Georgia, Times, system-ui" font-size="26" font-weight="900" fill="#78350f" letter-spacing="1.5">PANDIYAN</text>
    <text x="0" y="56" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="900" fill="#b45309" letter-spacing="3">COMPUTERS</text>
    <rect x="0" y="66" width="255" height="2.5" fill="url(#rubyGrad)" rx="1" />
    <text x="0" y="82" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="800" fill="#991b1b" letter-spacing="1.8">COMPUTER SALES & SERVICE · LAPTOP SPARES</text>
    <text x="0" y="94" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="600" fill="#78350f" letter-spacing="0.5">SHOP NO. 14, SIMMAKKAL, MADURAI - 625001</text>
  </g>
</svg>
`)}`;

// Pandiyan Computers Official Rubber Stamp (Rectangular Traditional Seal)
export const DEFAULT_PANDIYAN_STAMP_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 180" width="340" height="180">
  <g transform="rotate(3 170 90)">
    <!-- Outer Double Rounded Rectangle -->
    <rect x="8" y="8" width="324" height="164" rx="14" fill="none" stroke="#b91c1c" stroke-width="4" opacity="0.88" />
    <rect x="15" y="15" width="310" height="150" rx="10" fill="none" stroke="#b91c1c" stroke-width="1.8" opacity="0.82" />

    <!-- Header Firm Name -->
    <text x="170" y="44" font-family="serif, Georgia, system-ui" font-size="19" font-weight="900" fill="#b91c1c" text-anchor="middle" letter-spacing="2" opacity="0.95">
      ★ PANDIYAN COMPUTERS ★
    </text>

    <!-- Address & Branch -->
    <text x="170" y="65" font-family="system-ui, -apple-system, sans-serif" font-size="9.5" font-weight="700" fill="#b91c1c" text-anchor="middle" letter-spacing="0.8" opacity="0.9">
      SHOP NO. 14, SIMMAKKAL MAIN ROAD, MADURAI - 625001
    </text>

    <line x1="25" y1="75" x2="315" y2="75" stroke="#b91c1c" stroke-width="1.5" opacity="0.75" />

    <!-- Service Scope -->
    <text x="170" y="93" font-family="system-ui, -apple-system, sans-serif" font-size="10.5" font-weight="800" fill="#991b1b" text-anchor="middle" letter-spacing="1.2">
      SALES & SERVICE ESTIMATE DESK
    </text>

    <line x1="45" y1="104" x2="295" y2="104" stroke="#b91c1c" stroke-width="1" stroke-dasharray="4 2" opacity="0.75" />

    <!-- Verification / Signature Line -->
    <text x="170" y="126" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="800" fill="#b91c1c" text-anchor="middle" letter-spacing="1">
      VERIFIED · NON-GST RETAIL SLIP
    </text>

    <text x="170" y="150" font-family="system-ui, -apple-system, sans-serif" font-size="10.5" font-weight="900" fill="#7f1d1d" text-anchor="middle" letter-spacing="2">
      FOR PANDIYAN COMPUTERS
    </text>
  </g>
</svg>
`)}`;

/**
 * Theme Configurations for SGS
 */
export const SGS_THEMES: Record<BillingTheme, {
  name: string;
  primary: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  accent: string;
  headerBorder: string;
  previewColor: string;
}> = {
  modern_navy: {
    name: 'Modern Navy & Cobalt',
    primary: 'text-blue-900',
    border: 'border-blue-800',
    badgeBg: 'bg-blue-900',
    badgeText: 'text-white',
    accent: 'bg-blue-600',
    headerBorder: 'border-blue-900',
    previewColor: 'bg-blue-800',
  },
  classic_emerald: {
    name: 'Classic Emerald Tech',
    primary: 'text-emerald-900',
    border: 'border-emerald-700',
    badgeBg: 'bg-emerald-700',
    badgeText: 'text-white',
    accent: 'bg-emerald-600',
    headerBorder: 'border-emerald-700',
    previewColor: 'bg-emerald-700',
  },
  royal_purple: {
    name: 'Royal Cyber Purple',
    primary: 'text-purple-900',
    border: 'border-purple-700',
    badgeBg: 'bg-purple-700',
    badgeText: 'text-white',
    accent: 'bg-purple-600',
    headerBorder: 'border-purple-700',
    previewColor: 'bg-purple-700',
  },
  sleek_monochrome: {
    name: 'Sleek Charcoal Matrix',
    primary: 'text-slate-900',
    border: 'border-slate-800',
    badgeBg: 'bg-slate-900',
    badgeText: 'text-white',
    accent: 'bg-slate-700',
    headerBorder: 'border-slate-800',
    previewColor: 'bg-slate-900',
  },
};

/**
 * Theme Configurations for Pandiyan Computers
 */
export const PANDIYAN_THEMES: Record<PandiyanBillingTheme, {
  name: string;
  primary: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  accent: string;
  headerBorder: string;
  previewColor: string;
  slipBanner: string;
}> = {
  warm_amber: {
    name: 'Royal Gold & Amber',
    primary: 'text-amber-900',
    border: 'border-amber-600',
    badgeBg: 'bg-amber-600',
    badgeText: 'text-white',
    accent: 'bg-amber-500',
    headerBorder: 'border-amber-600',
    previewColor: 'bg-amber-600',
    slipBanner: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  crimson_ruby: {
    name: 'Heritage Crimson Ruby',
    primary: 'text-red-900',
    border: 'border-red-700',
    badgeBg: 'bg-red-700',
    badgeText: 'text-white',
    accent: 'bg-red-600',
    headerBorder: 'border-red-700',
    previewColor: 'bg-red-700',
    slipBanner: 'bg-red-100 text-red-900 border-red-200',
  },
  teak_bronze: {
    name: 'Warm Teak & Bronze',
    primary: 'text-orange-950',
    border: 'border-orange-800',
    badgeBg: 'bg-orange-800',
    badgeText: 'text-white',
    accent: 'bg-orange-600',
    headerBorder: 'border-orange-800',
    previewColor: 'bg-orange-800',
    slipBanner: 'bg-orange-100 text-orange-900 border-orange-200',
  },
  indigo_slate: {
    name: 'Temple Indigo & Brass',
    primary: 'text-indigo-950',
    border: 'border-indigo-800',
    badgeBg: 'bg-indigo-800',
    badgeText: 'text-white',
    accent: 'bg-indigo-600',
    headerBorder: 'border-indigo-800',
    previewColor: 'bg-indigo-800',
    slipBanner: 'bg-indigo-100 text-indigo-900 border-indigo-200',
  },
};

/**
 * React Component for SGS Logo with fallback
 */
export const SgsLogo: React.FC<{ url?: string; className?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  url,
  className = '',
  size = 'md',
}) => {
  const logoSrc = url || DEFAULT_SGS_LOGO_DATA_URL;
  const sizeClasses = {
    sm: 'h-8 max-w-[130px]',
    md: 'h-12 max-w-[190px]',
    lg: 'h-16 max-w-[260px]',
  }[size];

  return (
    <img
      src={logoSrc}
      alt="Spider Grid Solutions Logo"
      className={`object-contain transition-transform select-none ${sizeClasses} ${className}`}
    />
  );
};

/**
 * React Component for Pandiyan Computers Logo with fallback
 */
export const PandiyanLogo: React.FC<{ url?: string; className?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  url,
  className = '',
  size = 'md',
}) => {
  const logoSrc = url || DEFAULT_PANDIYAN_LOGO_DATA_URL;
  const sizeClasses = {
    sm: 'h-8 max-w-[130px]',
    md: 'h-12 max-w-[190px]',
    lg: 'h-16 max-w-[260px]',
  }[size];

  return (
    <img
      src={logoSrc}
      alt="Pandiyan Computers Logo"
      className={`object-contain transition-transform select-none ${sizeClasses} ${className}`}
    />
  );
};

/**
 * React Component for SGS Rubber Stamp
 */
export const SgsStamp: React.FC<{ url?: string; className?: string }> = ({ url, className = '' }) => {
  const stampSrc = url || DEFAULT_SGS_STAMP_DATA_URL;
  return (
    <img
      src={stampSrc}
      alt="Spider Grid Solutions Official Rubber Seal"
      className={`max-h-24 max-w-full object-contain filter drop-shadow-xs transform -rotate-3 select-none pointer-events-none ${className}`}
    />
  );
};

/**
 * React Component for Pandiyan Computers Rubber Stamp
 */
export const PandiyanStamp: React.FC<{ url?: string; className?: string }> = ({ url, className = '' }) => {
  const stampSrc = url || DEFAULT_PANDIYAN_STAMP_DATA_URL;
  return (
    <img
      src={stampSrc}
      alt="Pandiyan Computers Official Rubber Seal"
      className={`max-h-24 max-w-full object-contain filter drop-shadow-xs transform rotate-2 select-none pointer-events-none ${className}`}
    />
  );
};
