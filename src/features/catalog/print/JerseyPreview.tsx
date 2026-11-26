import { useId } from 'react';
import type {
  JerseyFontStyle,
  JerseyPatchId,
  JerseyVisualTheme,
} from './types';

interface JerseyPreviewSvgProps {
  theme: JerseyVisualTheme;
  playerName: string;
  squadNumber: string;
  patch: JerseyPatchId;
  fontStyle?: JerseyFontStyle;
  showPrint?: boolean;
  className?: string;
}

const DEFAULT_THEME: JerseyVisualTheme = {
  primary: '#0A338F',
  secondary: '#08266E',
  trim: '#D81E2B',
  text: '#FFFFFF',
  pattern: 'angkor',
  crestLabel: 'SPORT CASTLE',
};

export function JerseyPreviewSvg({
  theme = DEFAULT_THEME,
  playerName,
  squadNumber,
  patch,
  fontStyle = 'pro-condensed',
  showPrint = true,
  className = '',
}: JerseyPreviewSvgProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const clipId = `jersey-body-clip-${uid}`;
  const sheenId = `jersey-sheen-${uid}`;
  const contourId = `jersey-contour-${uid}`;
  const meshId = `jersey-mesh-${uid}`;

  const displayName = (playerName || 'YOUR NAME').toUpperCase();
  const displayNumber = squadNumber || '10';

  const numberFontFamily =
    fontStyle === 'motorsport-aero'
      ? '"Barlow Condensed", "Archivo", sans-serif'
      : fontStyle === 'classic-block'
        ? '"JetBrains Mono", monospace'
        : '"Barlow Condensed", "Archivo", sans-serif';

  const numberLetterSpacing =
    fontStyle === 'motorsport-aero' ? '-0.04em' : '-0.015em';

  const patchBadgeText =
    patch === 'ucl'
      ? 'UCL★'
      : patch === 'cpl'
        ? 'CPL'
        : patch === 'aff'
          ? 'AFF'
          : patch === 'champions'
            ? '★'
            : patch === 'f1-paddock'
              ? 'F1'
              : null;

  // Tailored athletic silhouette path with natural shoulder slope & subtle waist taper
  const bodyPath =
    'M122 30 Q180 50 238 30 L282 47 Q302 58 340 120 L294 164 L264 132 Q259 246 266 364 Q180 378 94 364 Q101 246 96 132 L66 164 L20 120 Q58 58 78 47 Z';

  return (
    <div className={`relative select-none ${className}`}>
      <svg
        viewBox="14 22 332 362"
        className="h-full w-full drop-shadow-[0_14px_24px_rgba(14,17,19,0.16)]"
        role="img"
        aria-label={`Back view of jersey showing ${displayName} number ${displayNumber}`}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={bodyPath} />
          </clipPath>

          {/* Studio softbox lighting gradient */}
          <linearGradient id={sheenId} x1="0.1" y1="0" x2="0.95" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.18" />
            <stop offset="42%" stopColor="#FFFFFF" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.2" />
          </linearGradient>

          {/* Cylindrical athletic torso wrap shading for realistic 3D garment volume */}
          <linearGradient id={contourId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.22" />
            <stop offset="16%" stopColor="#000000" stopOpacity="0.06" />
            <stop offset="38%" stopColor="#FFFFFF" stopOpacity="0.08" />
            <stop offset="62%" stopColor="#FFFFFF" stopOpacity="0.04" />
            <stop offset="84%" stopColor="#000000" stopOpacity="0.07" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.24" />
          </linearGradient>

          {/* Subtle breathable jacquard micro-mesh pattern */}
          <pattern
            id={meshId}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="0.65" fill="#000000" fillOpacity="0.045" />
            <circle cx="6" cy="6" r="0.65" fill="#FFFFFF" fillOpacity="0.055" />
          </pattern>
        </defs>

        {/* Base Jersey Silhouette */}
        <g clipPath={`url(#${clipId})`}>
          <rect x="0" y="0" width="360" height="400" fill={theme.primary} />

          {/* Pattern variants */}
          {theme.pattern === 'stripes' && (
            <g>
              <rect x="96" y="20" width="28" height="365" fill={theme.secondary} opacity="0.92" />
              <rect x="152" y="20" width="28" height="365" fill={theme.secondary} opacity="0.92" />
              <rect x="208" y="20" width="28" height="365" fill={theme.secondary} opacity="0.92" />
            </g>
          )}

          {theme.pattern === 'sash' && (
            <polygon
              points="70,380 260,20 315,20 125,380"
              fill={theme.secondary}
              opacity="0.18"
            />
          )}

          {theme.pattern === 'angkor' && (
            <g opacity="0.11" stroke={theme.text} strokeWidth="1.2" fill="none">
              <path d="M180 80 L230 130 L180 180 L130 130 Z" />
              <path d="M180 160 L230 210 L180 260 L130 210 Z" />
              <path d="M180 240 L230 290 L180 340 L130 290 Z" />
              <line x1="180" y1="45" x2="180" y2="365" />
            </g>
          )}

          {theme.pattern === 'racing' && (
            <g>
              {/* Side carbon motorsport panels */}
              <path d="M92 130 L124 148 L124 374 L92 374 Z" fill={theme.secondary} opacity="0.9" />
              <path d="M268 130 L236 148 L236 374 L268 374 Z" fill={theme.secondary} opacity="0.9" />
              {/* Aero speed stripes across lower back */}
              <polygon points="102,324 258,302 258,314 102,336" fill={theme.trim} opacity="0.88" />
              <polygon points="102,342 258,320 258,326 102,348" fill={theme.text} opacity="0.35" />
            </g>
          )}

          {/* Jacquard micro-mesh & studio 3D volume shading */}
          <rect x="0" y="0" width="360" height="400" fill={`url(#${meshId})`} />
          <rect x="0" y="0" width="360" height="400" fill={`url(#${contourId})`} />
          <rect x="0" y="0" width="360" height="400" fill={`url(#${sheenId})`} />

          {/* Raglan back shoulder stitching seams & natural vertical fabric drape */}
          <path
            d="M126 36 Q116 86 96 132"
            fill="none"
            stroke="#000000"
            strokeOpacity="0.14"
            strokeWidth="1.2"
          />
          <path
            d="M234 36 Q244 86 264 132"
            fill="none"
            stroke="#000000"
            strokeOpacity="0.14"
            strokeWidth="1.2"
          />
          <path
            d="M114 295 Q118 330 112 364"
            fill="none"
            stroke="#000000"
            strokeOpacity="0.09"
            strokeWidth="2.5"
          />
          <path
            d="M246 295 Q242 330 248 364"
            fill="none"
            stroke="#000000"
            strokeOpacity="0.09"
            strokeWidth="2.5"
          />

          {/* Stitched bottom hem */}
          <path
            d="M94 354 Q180 368 266 354"
            fill="none"
            stroke="#000000"
            strokeOpacity="0.16"
            strokeWidth="1"
            strokeDasharray="3 2"
          />

          {/* Sleeve cuff trim */}
          <path d="M22 114 L72 158 L64 166 L14 122 Z" fill={theme.trim} />
          <path d="M338 114 L288 158 L296 166 L346 122 Z" fill={theme.trim} />
        </g>

        {/* Inner collar recess + ribbed neckline tape */}
        <path
          d="M122 30 Q180 42 238 30 Q180 54 122 30 Z"
          fill="#0B0D10"
          fillOpacity="0.22"
        />
        <path
          d="M120 31 Q180 56 240 31"
          fill="none"
          stroke={theme.trim}
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M125 34 Q180 54 235 34"
          fill="none"
          stroke="#0B0D10"
          strokeOpacity="0.22"
          strokeWidth="1.8"
        />

        {/* Back Neck Locker Emblem */}
        <text
          x="180"
          y="74"
          textAnchor="middle"
          fill={theme.text}
          opacity="0.72"
          fontSize="8.5"
          fontWeight="700"
          letterSpacing="2.2"
          fontFamily="Archivo, sans-serif"
        >
          {theme.crestLabel}
        </text>

        {/* Sleeve Patch Visual */}
        {showPrint && patchBadgeText && (
          <g transform="translate(292, 92) rotate(22)">
            <rect
              x="-16"
              y="-12"
              width="32"
              height="24"
              rx="4"
              fill="#0B0D10"
              stroke="#D4AF37"
              strokeWidth="1.5"
            />
            <text
              x="0"
              y="4"
              textAnchor="middle"
              fill="#FFFFFF"
              fontSize="9"
              fontWeight="800"
              fontFamily="Archivo, sans-serif"
            >
              {patchBadgeText}
            </text>
          </g>
        )}

        {/* Back Name & Squad Number */}
        {showPrint ? (
          <g>
            {/* Subtle back plate readability shadow for striped kits */}
            {theme.pattern === 'stripes' && (
              <rect
                x="112"
                y="92"
                width="136"
                height="184"
                rx="6"
                fill={theme.primary}
                opacity="0.88"
              />
            )}
            <text
              x="180"
              y="128"
              textAnchor="middle"
              fill={theme.text}
              fontSize={displayName.length > 10 ? '21' : '26'}
              fontWeight="800"
              letterSpacing="1.8"
              fontFamily={numberFontFamily}
              style={{
                fontStyle: fontStyle === 'motorsport-aero' ? 'italic' : 'normal',
              }}
            >
              {displayName}
            </text>
            <text
              x="180"
              y="266"
              textAnchor="middle"
              fill={theme.text}
              fontSize="132"
              fontWeight="900"
              letterSpacing={numberLetterSpacing}
              fontFamily={numberFontFamily}
              style={{
                fontStyle: fontStyle === 'motorsport-aero' ? 'italic' : 'normal',
              }}
            >
              {displayNumber}
            </text>
            <text
              x="180"
              y="289"
              textAnchor="middle"
              fill={theme.text}
              opacity="0.58"
              fontSize="7.5"
              fontWeight="600"
              letterSpacing="1.6"
              fontFamily="JetBrains Mono, monospace"
            >
              MATCHDAY PRO PRINT
            </text>
          </g>
        ) : (
          <text
            x="180"
            y="196"
            textAnchor="middle"
            fill={theme.text}
            opacity="0.45"
            fontSize="12"
            fontWeight="600"
            letterSpacing="2"
            fontFamily="Archivo, sans-serif"
          >
            BLANK MATCH BACK
          </text>
        )}

        {/* Crisp studio outer edge for light jerseys */}
        <path
          d={bodyPath}
          fill="none"
          stroke="#0E1113"
          strokeOpacity="0.14"
          strokeWidth="1.4"
        />
      </svg>
    </div>
  );
}
