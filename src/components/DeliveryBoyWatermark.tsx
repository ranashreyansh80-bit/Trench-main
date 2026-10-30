import React from 'react';

interface DeliveryBoyWatermarkProps {
  className?: string;
  opacityClass?: string;
  variant?: 'card' | 'fullscreen' | 'compact';
}

/**
 * Transparent Delivery Boy & Courier Bike background illustration.
 * Renders as a crisp, scalable, high-fidelity SVG watermark behind
 * delivery partner onboarding forms and portals without hindering readability.
 */
export const DeliveryBoyWatermark: React.FC<DeliveryBoyWatermarkProps> = ({
  className = '',
  opacityClass = 'opacity-[0.08] sm:opacity-[0.10]',
  variant = 'card',
}) => {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 pointer-events-none select-none overflow-hidden z-0 flex items-center justify-center ${opacityClass} ${className}`}
    >
      <svg
        viewBox="0 0 900 650"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full object-contain ${
          variant === 'card' ? 'scale-105 sm:scale-100 translate-y-2' : 'scale-100'
        }`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Brand Gradients */}
          <linearGradient id="dboy-navy" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#000080" />
            <stop offset="100%" stopColor="#1e3a8a" />
          </linearGradient>

          <linearGradient id="dboy-green" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#159937" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>

          <linearGradient id="dboy-amber" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ea580c" />
          </linearGradient>

          <linearGradient id="dboy-silver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>

          <linearGradient id="dboy-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#000080" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="road-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#cbd5e1" stopOpacity="0" />
            <stop offset="25%" stopColor="#000080" stopOpacity="0.25" />
            <stop offset="75%" stopColor="#159937" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ambient Circular Radiance */}
        <circle cx="520" cy="340" r="280" fill="url(#dboy-glow)" />
        <circle cx="280" cy="400" r="160" fill="#159937" fillOpacity="0.06" />

        {/* Road Track & Speed Markings */}
        <path
          d="M 40 520 L 860 520"
          stroke="url(#road-grad)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <path
          d="M 90 540 L 810 540"
          stroke="#000080"
          strokeWidth="3"
          strokeDasharray="24 18"
          strokeOpacity="0.35"
        />

        {/* Speed & Wind Motion Trails Behind Rider */}
        <g stroke="#000080" strokeWidth="3" strokeLinecap="round" opacity="0.45">
          <line x1="80" y1="230" x2="260" y2="230" strokeDasharray="30 15" />
          <line x1="120" y1="280" x2="280" y2="280" strokeDasharray="40 20" />
          <line x1="60" y1="360" x2="220" y2="360" strokeDasharray="25 15" />
          <line x1="140" y1="410" x2="270" y2="410" strokeDasharray="35 15" />
          <line x1="110" y1="460" x2="240" y2="460" strokeDasharray="20 12" />
        </g>

        {/* Delivery Box / Thermal Courier Bag on Back Rack */}
        <g id="delivery-bag">
          <rect
            x="240"
            y="250"
            width="120"
            height="140"
            rx="16"
            fill="url(#dboy-navy)"
            stroke="#1e3a8a"
            strokeWidth="4"
          />
          {/* Reflective safety strip */}
          <rect x="240" y="300" width="120" height="18" fill="url(#dboy-green)" />
          {/* Fast Courier Lightning Logo */}
          <path
            d="M 298 268 L 286 288 L 298 288 L 288 312 L 314 286 L 302 286 Z"
            fill="#ffffff"
          />
          {/* Straps & latches */}
          <rect x="256" y="250" width="8" height="140" fill="#0f172a" opacity="0.3" />
          <rect x="336" y="250" width="8" height="140" fill="#0f172a" opacity="0.3" />
          <circle cx="300" cy="345" r="8" fill="#ffffff" fillOpacity="0.9" />
          {/* "FAST" text */}
          <text
            x="300"
            y="370"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="12"
            fontWeight="bold"
            fontFamily="sans-serif"
            letterSpacing="2"
          >
            DELIVERY
          </text>
        </g>

        {/* REAR WHEEL */}
        <g id="rear-wheel">
          {/* Outer Tire */}
          <circle cx="280" cy="480" r="68" fill="#1e293b" />
          <circle cx="280" cy="480" r="54" fill="#0f172a" />
          {/* Alloy Rim */}
          <circle cx="280" cy="480" r="44" fill="#64748b" />
          <circle cx="280" cy="480" r="30" fill="#e2e8f0" />
          {/* Spokes */}
          <line x1="280" y1="436" x2="280" y2="524" stroke="#94a3b8" strokeWidth="5" />
          <line x1="236" y1="480" x2="324" y2="480" stroke="#94a3b8" strokeWidth="5" />
          <line x1="248" y1="448" x2="312" y2="512" stroke="#94a3b8" strokeWidth="4" />
          <line x1="312" y1="448" x2="248" y2="512" stroke="#94a3b8" strokeWidth="4" />
          {/* Center Axle */}
          <circle cx="280" cy="480" r="14" fill="#000080" />
          <circle cx="280" cy="480" r="6" fill="#38bdf8" />
          {/* Mudguard */}
          <path
            d="M 216 470 A 72 72 0 0 1 346 440"
            stroke="#000080"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* FRONT WHEEL */}
        <g id="front-wheel">
          {/* Outer Tire */}
          <circle cx="680" cy="480" r="68" fill="#1e293b" />
          <circle cx="680" cy="480" r="54" fill="#0f172a" />
          {/* Alloy Rim */}
          <circle cx="680" cy="480" r="44" fill="#64748b" />
          <circle cx="680" cy="480" r="30" fill="#e2e8f0" />
          {/* Spokes */}
          <line x1="680" y1="436" x2="680" y2="524" stroke="#94a3b8" strokeWidth="5" />
          <line x1="636" y1="480" x2="724" y2="480" stroke="#94a3b8" strokeWidth="5" />
          <line x1="648" y1="448" x2="712" y2="512" stroke="#94a3b8" strokeWidth="4" />
          <line x1="712" y1="448" x2="648" y2="512" stroke="#94a3b8" strokeWidth="4" />
          {/* Center Axle */}
          <circle cx="680" cy="480" r="14" fill="#000080" />
          <circle cx="680" cy="480" r="6" fill="#38bdf8" />
          {/* Front Mudguard */}
          <path
            d="M 618 450 A 72 72 0 0 1 742 455"
            stroke="#000080"
            strokeWidth="10"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* ELECTRIC SCOOTER / MOTORCYCLE CHASSIS */}
        <g id="chassis">
          {/* Swingarm / Motor Drive */}
          <path
            d="M 280 480 L 400 480 L 440 430 L 340 430 Z"
            fill="#334155"
          />
          {/* Bottom Floorboard */}
          <path
            d="M 370 480 L 530 480 L 550 440 L 370 440 Z"
            fill="url(#dboy-navy)"
            rx="6"
          />
          {/* EV Battery Pack Indicator */}
          <rect x="420" y="450" width="80" height="20" rx="5" fill="#0f172a" />
          <circle cx="435" cy="460" r="4" fill="#159937" />
          <circle cx="450" cy="460" r="4" fill="#159937" />
          <circle cx="465" cy="460" r="4" fill="#159937" />
          <circle cx="480" cy="460" r="4" fill="#159937" />

          {/* Main Aerodynamic Front Cowl */}
          <path
            d="M 520 480 L 640 440 L 660 330 L 580 320 L 510 410 Z"
            fill="url(#dboy-navy)"
            stroke="#1e3a8a"
            strokeWidth="4"
          />
          {/* Contrast Accent Wing in Emerald Green */}
          <path
            d="M 560 380 L 650 350 L 640 375 L 545 410 Z"
            fill="url(#dboy-green)"
          />

          {/* Front Suspension Fork */}
          <line
            x1="620"
            y1="340"
            x2="680"
            y2="480"
            stroke="#94a3b8"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <line
            x1="620"
            y1="340"
            x2="680"
            y2="480"
            stroke="#cbd5e1"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* LED Headlight Beam */}
          <polygon
            points="660,335 830,300 850,410 660,365"
            fill="url(#dboy-glow)"
            opacity="0.6"
          />
          <ellipse cx="660" cy="350" rx="10" ry="16" fill="#38bdf8" />
          <ellipse cx="663" cy="350" rx="6" ry="11" fill="#ffffff" />

          {/* Scooter Seat */}
          <path
            d="M 330 390 C 350 370, 470 370, 500 400 L 480 425 L 340 420 Z"
            fill="#1e293b"
            stroke="#0f172a"
            strokeWidth="3"
          />

          {/* Handlebar Stem and Grips */}
          <line
            x1="590"
            y1="330"
            x2="570"
            y2="245"
            stroke="#475569"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Handlebar Top T-bar */}
          <path
            d="M 535 250 L 585 240 L 600 248"
            stroke="#1e293b"
            strokeWidth="9"
            strokeLinecap="round"
            fill="none"
          />
          {/* Mirror */}
          <circle cx="530" cy="225" r="9" fill="#94a3b8" stroke="#334155" strokeWidth="2" />
          <line x1="535" y1="233" x2="545" y2="248" stroke="#475569" strokeWidth="4" />
        </g>

        {/* DELIVERY BOY / RIDER BODY & POSE */}
        <g id="delivery-rider">
          {/* Legs & Shoes */}
          {/* Thigh */}
          <path
            d="M 420 375 L 485 365 L 515 440 L 460 445 Z"
            fill="#1e293b"
            stroke="#0f172a"
            strokeWidth="3"
          />
          {/* Shin */}
          <path
            d="M 485 435 L 505 480 L 475 485 L 460 445 Z"
            fill="#0f172a"
          />
          {/* Sneaker */}
          <path
            d="M 470 480 L 535 480 C 540 480 545 485 540 492 L 465 492 Z"
            fill="#ffffff"
            stroke="#000080"
            strokeWidth="2"
          />
          {/* Shoe sole */}
          <rect x="465" y="490" width="75" height="4" rx="2" fill="url(#dboy-green)" />

          {/* Torso & Uniform Jacket */}
          <path
            d="M 370 370 C 370 320, 390 260, 440 235 C 475 220, 500 250, 480 345 Z"
            fill="url(#dboy-navy)"
            stroke="#000066"
            strokeWidth="3"
          />
          {/* Jacket Zipper line & Green Accent Panels */}
          <path
            d="M 445 235 L 465 340"
            stroke="#ffffff"
            strokeWidth="3"
            strokeDasharray="6 3"
          />
          <path
            d="M 410 265 L 440 250 L 435 290 Z"
            fill="url(#dboy-green)"
          />

          {/* Arms reaching for handlebars */}
          {/* Upper Arm */}
          <path
            d="M 455 245 C 490 260, 520 255, 565 248"
            stroke="url(#dboy-navy)"
            strokeWidth="22"
            strokeLinecap="round"
            fill="none"
          />
          {/* Forearm & Cuff */}
          <line
            x1="520"
            y1="254"
            x2="570"
            y2="248"
            stroke="url(#dboy-green)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Hand Glove */}
          <ellipse cx="572" cy="247" rx="10" ry="8" fill="#1e293b" />

          {/* Neck */}
          <rect x="450" y="200" width="22" height="24" rx="6" fill="#fcd34d" />

          {/* HELMET & FACE */}
          {/* Modern Safety Helmet */}
          <path
            d="M 425 185 C 420 120, 515 110, 525 180 C 525 210, 490 220, 445 215 Z"
            fill="url(#dboy-navy)"
            stroke="#1e3a8a"
            strokeWidth="4"
          />
          {/* Helmet Green Racing Stripe */}
          <path
            d="M 432 170 C 445 130, 490 125, 515 155"
            stroke="url(#dboy-green)"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          {/* Dark Glass Visor */}
          <path
            d="M 465 170 C 495 160, 530 170, 525 198 C 500 205, 475 200, 465 170 Z"
            fill="#0f172a"
            stroke="#38bdf8"
            strokeWidth="2.5"
          />
          {/* Visor Sunlight Glint / Reflection */}
          <path
            d="M 478 174 L 515 178"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            opacity="0.8"
          />
          {/* Helmet Chin Guard & Buckle */}
          <path
            d="M 445 208 L 475 212"
            stroke="#334155"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>

        {/* Floating Brand Badges & Deliveries Sparkles */}
        <g opacity="0.7">
          {/* Green EV Eco Badge */}
          <g transform="translate(680, 210)">
            <circle cx="20" cy="20" r="24" fill="#ecfdf5" stroke="#10b981" strokeWidth="2.5" />
            <path
              d="M 18 10 L 28 20 L 22 20 L 25 30 L 14 19 L 19 19 Z"
              fill="#10b981"
            />
          </g>

          {/* Package Delivery Parcel Icon Floating */}
          <g transform="translate(140, 160)">
            <rect x="0" y="0" width="36" height="30" rx="5" fill="#f8fafc" stroke="#000080" strokeWidth="2" />
            <line x1="0" y1="12" x2="36" y2="12" stroke="#000080" strokeWidth="1.5" />
            <line x1="18" y1="0" x2="18" y2="30" stroke="#000080" strokeWidth="1.5" />
          </g>

          {/* Verified Delivery Shield */}
          <g transform="translate(730, 130)">
            <circle cx="16" cy="16" r="16" fill="#e0e7ff" stroke="#000080" strokeWidth="2" />
            <path
              d="M 11 16 L 15 20 L 22 12"
              fill="none"
              stroke="#000080"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};
