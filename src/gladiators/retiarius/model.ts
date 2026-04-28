import type { BoneDef } from "../../animation/skeletonTypes";

/**
 * Arena-scale Retiarius SVG.
 *
 * Built as a compact top-down-ish sprite: broad shadow, dark outline, lean body,
 * oversized trident and net so the class stays readable at arena distance.
 */
export function createRetiariusSvg(): string {
  return /* html */ `
<svg viewBox="0 0 280 360" fill="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">
<defs>
  <linearGradient id="r-sand-shadow" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#2a1b10" stop-opacity="0"/>
    <stop offset="50%" stop-color="#2a1b10" stop-opacity="0.34"/>
    <stop offset="100%" stop-color="#2a1b10" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="r-skin" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#d39764"/>
    <stop offset="100%" stop-color="#8d562e"/>
  </linearGradient>
  <linearGradient id="r-skin-shade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#a76b3e"/>
    <stop offset="100%" stop-color="#5d3917"/>
  </linearGradient>
  <linearGradient id="r-skin-lit" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#ecb583"/>
    <stop offset="100%" stop-color="#a36c3d"/>
  </linearGradient>
  <linearGradient id="r-steel" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#dcdcd2"/>
    <stop offset="45%" stop-color="#7e8586"/>
    <stop offset="100%" stop-color="#2c3134"/>
  </linearGradient>
  <linearGradient id="r-bronze" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#e6c053"/>
    <stop offset="50%" stop-color="#a87618"/>
    <stop offset="100%" stop-color="#5d3a0a"/>
  </linearGradient>
  <linearGradient id="r-bronze-lit" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#f4d063"/>
    <stop offset="100%" stop-color="#7a5511"/>
  </linearGradient>
  <linearGradient id="r-blue" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#2c526b"/>
    <stop offset="100%" stop-color="#13283a"/>
  </linearGradient>
  <linearGradient id="r-red" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#b03222"/>
    <stop offset="100%" stop-color="#56170f"/>
  </linearGradient>
  <linearGradient id="r-leather" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#7d5429"/>
    <stop offset="100%" stop-color="#33200f"/>
  </linearGradient>
  <linearGradient id="r-cloth" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#e2cb95"/>
    <stop offset="100%" stop-color="#967a44"/>
  </linearGradient>
  <linearGradient id="r-rope" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#d6c389"/>
    <stop offset="100%" stop-color="#7c6d44"/>
  </linearGradient>
  <linearGradient id="r-wood" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#3e2613"/>
    <stop offset="50%" stop-color="#8a6436"/>
    <stop offset="100%" stop-color="#3a2410"/>
  </linearGradient>
  <filter id="r-soft-outline" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="0.6" flood-color="#1f130b" flood-opacity="0.55"/>
  </filter>
</defs>

<ellipse cx="140" cy="318" rx="62" ry="13" fill="url(#r-sand-shadow)"/>

<g data-bone="root" filter="url(#r-soft-outline)" stroke="#24160c" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">

  <path d="M141 226 Q146 252 152 268 Q156 284 156 298 L172 296 Q172 280 169 264 Q165 244 159 226 Z" fill="url(#r-skin-shade)"/>
  <path d="M152 250 Q158 264 158 280" stroke="#3e220e" stroke-width="1.4" fill="none" opacity="0.55"/>
  <path d="M155 296 Q151 310 158 312 L173 312 Q177 308 174 298 Z" fill="url(#r-leather)"/>
  <path d="M161 300 L163 309" stroke="#2c1b0c" stroke-width="1.4"/>
  <path d="M168 300 L170 309" stroke="#2c1b0c" stroke-width="1.4"/>
  <path d="M152 296 Q162 292 174 296" stroke="#3a2207" stroke-width="1.3" fill="none"/>

  <path d="M120 226 Q116 252 110 268 Q105 284 104 298 L120 298 Q121 282 124 264 Q128 244 134 226 Z" fill="url(#r-skin)"/>
  <path d="M118 244 Q119 256 117 270" stroke="#f0bb83" stroke-width="1.3" fill="none" opacity="0.6"/>
  <path d="M114 270 Q112 282 113 296" stroke="#5d3617" stroke-width="1.3" fill="none" opacity="0.5"/>
  <path d="M112 268 Q117 268 124 264" stroke="#5d3617" stroke-width="1.3" fill="none" opacity="0.5"/>
  <path d="M104 296 Q100 310 108 312 L123 312 Q127 308 122 298 Z" fill="url(#r-leather)"/>
  <path d="M111 300 L113 309" stroke="#2c1b0c" stroke-width="1.4"/>
  <path d="M118 300 L119 309" stroke="#2c1b0c" stroke-width="1.4"/>
  <path d="M101 296 Q112 292 124 296" stroke="#3a2207" stroke-width="1.3" fill="none"/>

  <path d="M110 214 L168 214 L172 234 Q140 246 106 234 Z" fill="url(#r-cloth)"/>
  <path d="M114 220 L116 240" stroke="#8a7341" stroke-width="1.1" opacity="0.6"/>
  <path d="M125 220 L125 244" stroke="#8a7341" stroke-width="1.1" opacity="0.55"/>
  <path d="M139 220 L139 246" stroke="#8a7341" stroke-width="1.1" opacity="0.6"/>
  <path d="M153 220 L153 244" stroke="#8a7341" stroke-width="1.1" opacity="0.55"/>
  <path d="M163 220 L161 240" stroke="#8a7341" stroke-width="1.1" opacity="0.6"/>
  <path d="M108 224 Q140 234 170 224" stroke="#7a6235" stroke-width="1.3" fill="none" opacity="0.55"/>

  <path d="M108 206 L170 206 L172 220 Q140 230 106 220 Z" fill="url(#r-leather)"/>
  <path d="M111 213 Q140 220 168 213" stroke="#3a2207" stroke-width="1.3" fill="none"/>
  <rect x="132" y="207" width="14" height="11" rx="1.4" fill="url(#r-bronze-lit)"/>
  <rect x="134" y="209" width="10" height="7" rx="0.8" fill="none" stroke="#3a2207" stroke-width="1"/>
  <circle cx="139" cy="212.5" r="1.1" fill="#3a2207"/>

  <g data-bone="torso">

    <g data-bone="arm-l">
      <path d="M113 148 Q100 152 88 168 L98 181 Q108 173 119 165 Z" fill="url(#r-skin)"/>
      <path d="M111 146 Q98 150 86 166 L96 178 Q106 168 117 160 Z" fill="url(#r-steel)"/>
      <path d="M111 146 Q98 150 86 166 L96 178 Q106 168 117 160 Z" fill="none" stroke="#1f2425" stroke-width="1"/>
      <path d="M91 156 Q98 154 105 156" stroke="#dcdcd2" stroke-width="1.4" fill="none" opacity="0.7"/>
      <path d="M89 164 Q97 162 104 164" stroke="#dcdcd2" stroke-width="1.4" fill="none" opacity="0.65"/>
      <path d="M89 172 Q97 170 104 172" stroke="#dcdcd2" stroke-width="1.4" fill="none" opacity="0.55"/>

      <path d="M105 134 Q100 130 99 142 Q98 156 106 168 Q116 170 122 164 Q121 152 119 140 Q115 130 105 134 Z" fill="url(#r-bronze)"/>
      <path d="M105 134 Q100 130 99 142 Q98 156 106 168 Q116 170 122 164 Q121 152 119 140 Q115 130 105 134 Z" fill="none" stroke="#3a2207" stroke-width="1.3"/>
      <path d="M104 140 Q104 154 110 164" stroke="#f4d063" stroke-width="1.4" fill="none" opacity="0.7"/>
      <circle cx="109" cy="150" r="2.6" fill="url(#r-bronze-lit)"/>
      <circle cx="109" cy="150" r="2.6" fill="none" stroke="#3a2207" stroke-width="0.9"/>

      <g data-bone="forearm-l">
        <path d="M89 170 Q79 184 71 204 L83 211 Q92 196 100 180 Z" fill="url(#r-skin-shade)"/>
        <path d="M89 170 L100 180 Q92 188 88 196 L78 191 Z" fill="url(#r-steel)"/>
        <path d="M82 188 Q88 188 94 188" stroke="#dcdcd2" stroke-width="1.3" fill="none" opacity="0.6"/>
        <path d="M78 196 Q84 196 90 196" stroke="#dcdcd2" stroke-width="1.3" fill="none" opacity="0.55"/>

        <path d="M68 203 Q76 200 84 208 L80 218 Q68 219 64 211 Z" fill="url(#r-skin)"/>
        <path d="M71 209 Q76 208 81 211" stroke="#5d3617" stroke-width="0.9" fill="none" opacity="0.55"/>
        <path d="M73 213 Q77 212 81 214" stroke="#5d3617" stroke-width="0.9" fill="none" opacity="0.55"/>

        <g data-bone="net">
          <path d="M65 209 Q49 204 32 188" stroke="#8f8157" stroke-width="2.2" fill="none"/>
          <path d="M26 154 L72 194 L27 246 L-20 200 Z" fill="rgba(160,140,92,0.18)" stroke="url(#r-rope)" stroke-width="2"/>
          <path d="M26 168 L58 196 L27 230 L-4 200 Z" stroke="url(#r-rope)" stroke-width="1.5" fill="none"/>
          <path d="M26 182 L43 197 L27 215 L9 200 Z" stroke="url(#r-rope)" stroke-width="1.2" fill="none"/>
          <line x1="-15" y1="200" x2="68" y2="199" stroke="#b3a06a" stroke-width="1" opacity="0.7"/>
          <line x1="26" y1="160" x2="27" y2="240" stroke="#b3a06a" stroke-width="1" opacity="0.7"/>
          <line x1="2" y1="172" x2="52" y2="226" stroke="#8f8157" stroke-width="0.9" opacity="0.6"/>
          <line x1="50" y1="172" x2="0" y2="226" stroke="#8f8157" stroke-width="0.9" opacity="0.6"/>
          <line x1="-8" y1="186" x2="40" y2="234" stroke="#8f8157" stroke-width="0.7" opacity="0.5"/>
          <line x1="60" y1="186" x2="12" y2="234" stroke="#8f8157" stroke-width="0.7" opacity="0.5"/>
          <circle cx="26" cy="154" r="4" fill="#5b5340"/>
          <circle cx="72" cy="194" r="4" fill="#5b5340"/>
          <circle cx="27" cy="246" r="4" fill="#5b5340"/>
          <circle cx="-20" cy="200" r="4" fill="#5b5340"/>
          <circle cx="25" cy="153" r="1.4" fill="#9a8b66" opacity="0.85"/>
          <circle cx="71" cy="193" r="1.4" fill="#9a8b66" opacity="0.85"/>
          <circle cx="26" cy="245" r="1.4" fill="#9a8b66" opacity="0.85"/>
          <circle cx="-21" cy="199" r="1.4" fill="#9a8b66" opacity="0.85"/>
        </g>
      </g>
    </g>

    <path d="M114 144 Q140 134 158 148 L162 200 Q156 215 140 220 Q122 220 113 210 L110 178 Z" fill="url(#r-skin)"/>
    <path d="M114 144 Q140 134 158 148 L162 200 Q156 215 140 220 Q122 220 113 210 L110 178 Z" fill="none"/>

    <path d="M122 156 Q132 152 138 156 Q138 168 132 174 Q124 172 121 166 Z" fill="url(#r-skin-lit)" opacity="0.6"/>
    <path d="M138 156 Q146 152 154 156 Q154 168 148 174 Q140 172 138 166 Z" fill="url(#r-skin-lit)" opacity="0.6"/>
    <path d="M122 156 Q132 152 138 156" stroke="#73441f" stroke-width="1.2" fill="none" opacity="0.65"/>
    <path d="M138 156 Q146 152 154 156" stroke="#73441f" stroke-width="1.2" fill="none" opacity="0.65"/>
    <path d="M138 154 L138 200" stroke="#73441f" stroke-width="1" fill="none" opacity="0.45"/>
    <path d="M126 178 L150 178" stroke="#73441f" stroke-width="1.2" fill="none" opacity="0.5"/>
    <path d="M125 188 L151 188" stroke="#73441f" stroke-width="1.2" fill="none" opacity="0.5"/>
    <path d="M124 198 L152 198" stroke="#73441f" stroke-width="1.2" fill="none" opacity="0.45"/>

    <path d="M126 132 L147 132 L150 148 L122 148 Z" fill="url(#r-skin)"/>
    <path d="M122 144 Q136 148 150 144" stroke="#5d3617" stroke-width="1.2" fill="none" opacity="0.55"/>

    <g data-bone="arm-r">
      <path d="M155 150 Q168 156 178 172 L168 184 Q158 174 150 166 Z" fill="url(#r-skin)"/>
      <path d="M156 154 Q164 158 170 166" stroke="#73441f" stroke-width="1.2" fill="none" opacity="0.55"/>
      <path d="M158 162 Q166 168 172 174" stroke="#5d3617" stroke-width="1" fill="none" opacity="0.45"/>

      <g data-bone="forearm-r">
        <path d="M170 175 Q178 159 182 138 L194 142 Q190 162 180 184 Z" fill="url(#r-skin-shade)"/>
        <path d="M174 156 Q181 154 187 152" stroke="#5d3617" stroke-width="1.1" fill="none" opacity="0.55"/>

        <path d="M180 136 Q188 132 196 140 L193 152 Q182 154 178 144 Z" fill="url(#r-skin)"/>
        <path d="M183 142 L191 144" stroke="#5d3617" stroke-width="1" fill="none" opacity="0.6"/>
        <path d="M183 147 L190 149" stroke="#5d3617" stroke-width="1" fill="none" opacity="0.55"/>

        <g transform="rotate(-11 185 194)">
          <rect x="182" y="50" width="7" height="220" rx="3" fill="url(#r-wood)"/>
          <rect x="183.6" y="52" width="1.6" height="216" fill="#c19660" opacity="0.55"/>
          <rect x="180" y="54" width="11" height="6" rx="1" fill="url(#r-rope)"/>
          <rect x="180" y="54" width="11" height="6" rx="1" fill="none" stroke="#5b4f30" stroke-width="0.9"/>
          <line x1="181" y1="57" x2="190" y2="57" stroke="#5b4f30" stroke-width="0.6"/>
          <rect x="180" y="138" width="11" height="5" rx="1" fill="url(#r-rope)"/>
          <rect x="180" y="138" width="11" height="5" rx="1" fill="none" stroke="#5b4f30" stroke-width="0.8"/>

          <rect x="176" y="40" width="19" height="10" rx="2" fill="url(#r-steel)"/>
          <rect x="176" y="40" width="19" height="10" rx="2" fill="none" stroke="#1f2425" stroke-width="0.9"/>
          <path d="M176 44 L195 44" stroke="#454c4c" stroke-width="1.3" opacity="0.8"/>

          <path d="M185 41 L185 12 Q186 3 188 -2 Q191 3 191 12 L191 41 Z" fill="url(#r-steel)"/>
          <path d="M186 38 L186 14" stroke="#eeeee6" stroke-width="0.9" opacity="0.7"/>
          <path d="M180 41 L172 16 Q170 6 173 0 Q177 6 179 16 L185 41 Z" fill="url(#r-steel)"/>
          <path d="M177 38 L175 18" stroke="#eeeee6" stroke-width="0.9" opacity="0.6"/>
          <path d="M191 41 L200 16 Q202 6 199 0 Q195 6 193 16 L186 41 Z" fill="url(#r-steel)"/>
          <path d="M194 38 L196 18" stroke="#eeeee6" stroke-width="0.9" opacity="0.6"/>

          <path d="M174 22 L168 27" stroke="#34393b" stroke-width="2"/>
          <path d="M198 22 L204 27" stroke="#34393b" stroke-width="2"/>
          <path d="M176 30 L171 34" stroke="#34393b" stroke-width="1.4"/>
          <path d="M196 30 L201 34" stroke="#34393b" stroke-width="1.4"/>

          <rect x="180" y="266" width="11" height="9" rx="1.2" fill="url(#r-bronze)"/>
          <rect x="180" y="266" width="11" height="9" rx="1.2" fill="none" stroke="#3a2207" stroke-width="0.9"/>
        </g>
      </g>
    </g>

    <g data-bone="head">
      <path d="M114 110 Q116 90 128 82 Q142 74 156 84 Q164 94 161 114 L156 134 Q145 144 128 142 Q116 136 114 124 Z" fill="url(#r-skin)"/>
      <path d="M114 110 Q116 90 128 82 Q142 74 156 84 Q164 94 161 114 L156 134 Q145 144 128 142 Q116 136 114 124 Z" fill="none"/>

      <path d="M115 104 Q119 86 134 80 Q151 81 160 102 Q151 96 138 97 Q124 96 115 104 Z" fill="#1c130a"/>
      <path d="M120 92 Q128 86 136 88" stroke="#3a2a18" stroke-width="0.9" fill="none" opacity="0.7"/>
      <path d="M138 88 Q146 86 154 92" stroke="#3a2a18" stroke-width="0.9" fill="none" opacity="0.7"/>

      <path d="M113 106 Q124 100 138 100 Q152 100 161 107 L158 116 Q143 110 126 113 Q117 116 113 108 Z" fill="url(#r-red)"/>
      <path d="M113 106 Q124 100 138 100 Q152 100 161 107 L158 116 Q143 110 126 113 Q117 116 113 108 Z" fill="none" stroke="#3a1108" stroke-width="1"/>
      <path d="M115 110 Q126 106 138 106" stroke="#d34f38" stroke-width="0.9" fill="none" opacity="0.6"/>
      <path d="M114 108 Q108 110 105 117 L111 117 Q113 112 115 110 Z" fill="url(#r-red)"/>
      <path d="M105 117 L99 124" stroke="#56170f" stroke-width="2" fill="none"/>

      <ellipse cx="124" cy="121" rx="4.5" ry="2.6" fill="#0d0b08"/>
      <ellipse cx="146" cy="121" rx="4.5" ry="2.6" fill="#0d0b08"/>
      <path d="M124 117 L124 125" stroke="#3a2207" stroke-width="1.1"/>
      <path d="M146 117 L146 125" stroke="#3a2207" stroke-width="1.1"/>
      <circle cx="125.5" cy="120" r="0.9" fill="#f0d4a8" opacity="0.85"/>
      <circle cx="147.5" cy="120" r="0.9" fill="#f0d4a8" opacity="0.85"/>

      <path d="M119 116 Q124 113 129 116" stroke="#1c130a" stroke-width="1.5" fill="none"/>
      <path d="M141 116 Q146 113 151 116" stroke="#1c130a" stroke-width="1.5" fill="none"/>

      <path d="M135 122 L133 132 L139 133" stroke="#70411d" stroke-width="1.5" fill="none" opacity="0.85"/>
      <path d="M125 137 Q137 142 150 135" stroke="#5e3519" stroke-width="1.7" fill="none"/>
      <path d="M118 130 Q121 138 128 142" stroke="#5d3617" stroke-width="1" fill="none" opacity="0.5"/>
      <path d="M154 130 Q151 138 145 142" stroke="#5d3617" stroke-width="1" fill="none" opacity="0.5"/>
    </g>
  </g>
</g>
</svg>`;
}

export const retiariusBones: BoneDef[] = [
  { name: "root", px: 138, py: 224 },
  { name: "torso", px: 138, py: 218 },
  { name: "arm-l", px: 114, py: 154 },
  { name: "forearm-l", px: 92, py: 174 },
  { name: "net", px: 34, py: 198 },
  { name: "arm-r", px: 154, py: 154 },
  { name: "forearm-r", px: 174, py: 174 },
  { name: "head", px: 138, py: 142 },
];
