import type { BoneDef } from "../../animation/skeletonTypes";

/**
 * Arena-scale Murmillo SVG.
 *
 * Heavy infantry silhouette: galea helmet with red horsehair crest, lorica
 * musculata cuirass, pteruges skirt, scutum shield, gladius and bronze greave.
 * Bone pivots match {@link murmilloBones} so the same skeleton drives every
 * animation clip below.
 */
export function createMurmilloSvg(): string {
  return /* html */ `
<svg viewBox="0 0 260 360" fill="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">
<defs>
  <linearGradient id="m-sand-shadow" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#2a1b10" stop-opacity="0"/>
    <stop offset="50%" stop-color="#2a1b10" stop-opacity="0.36"/>
    <stop offset="100%" stop-color="#2a1b10" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="m-skin" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#d59a64"/>
    <stop offset="100%" stop-color="#8a542a"/>
  </linearGradient>
  <linearGradient id="m-skin-shade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#a26a3d"/>
    <stop offset="100%" stop-color="#5e3917"/>
  </linearGradient>
  <linearGradient id="m-bronze" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#e6c053"/>
    <stop offset="48%" stop-color="#a87618"/>
    <stop offset="100%" stop-color="#5d3a0a"/>
  </linearGradient>
  <linearGradient id="m-bronze-lit" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#f4d063"/>
    <stop offset="100%" stop-color="#7a5511"/>
  </linearGradient>
  <linearGradient id="m-iron" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#d3d4ce"/>
    <stop offset="45%" stop-color="#7a8082"/>
    <stop offset="100%" stop-color="#2c3134"/>
  </linearGradient>
  <linearGradient id="m-red" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#b03222"/>
    <stop offset="100%" stop-color="#56170f"/>
  </linearGradient>
  <linearGradient id="m-red-lit" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#d34f38"/>
    <stop offset="100%" stop-color="#6b1c12"/>
  </linearGradient>
  <linearGradient id="m-leather" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#7d5429"/>
    <stop offset="100%" stop-color="#33200f"/>
  </linearGradient>
  <radialGradient id="m-shield-boss" cx="0.35" cy="0.35" r="0.7">
    <stop offset="0%" stop-color="#f7df7c"/>
    <stop offset="55%" stop-color="#a87618"/>
    <stop offset="100%" stop-color="#3a2207"/>
  </radialGradient>
  <filter id="m-soft-outline" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="0.6" flood-color="#1c100a" flood-opacity="0.55"/>
  </filter>
</defs>

<ellipse cx="128" cy="316" rx="64" ry="13" fill="url(#m-sand-shadow)"/>

<g data-bone="root" filter="url(#m-soft-outline)" stroke="#1f130a" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round">

  <path d="M132 226 Q137 254 137 274 L146 274 Q146 252 144 226 Z" fill="url(#m-skin-shade)"/>
  <path d="M134 274 Q135 290 138 304 L148 304 Q149 290 146 274 Z" fill="url(#m-skin-shade)"/>
  <path d="M138 280 Q140 290 142 300" stroke="#3e220e" stroke-width="1.6" fill="none" opacity="0.55"/>
  <path d="M129 304 Q126 313 134 313 L155 313 Q160 313 156 305 Z" fill="url(#m-leather)"/>
  <path d="M137 305 L141 311" stroke="#2c1b0c" stroke-width="1.5"/>
  <path d="M146 305 L149 311" stroke="#2c1b0c" stroke-width="1.5"/>

  <path d="M106 226 Q103 252 107 274 L120 274 Q121 252 119 226 Z" fill="url(#m-skin)"/>
  <path d="M108 274 Q105 290 105 304 L118 304 Q120 290 119 274 Z" fill="url(#m-skin)"/>
  <path d="M108 270 Q113 274 119 270" stroke="#f0bb83" stroke-width="1.4" fill="none" opacity="0.6"/>
  <path d="M111 280 Q113 290 113 300" stroke="#5d3617" stroke-width="1.5" fill="none" opacity="0.45"/>

  <path d="M104 270 Q102 290 105 304 L120 304 Q123 290 121 270 Q113 266 104 270 Z" fill="url(#m-bronze)"/>
  <path d="M104 270 Q113 268 121 270" stroke="#3a2207" stroke-width="1.6" fill="none"/>
  <path d="M107 282 L118 282" stroke="#5d3a0a" stroke-width="1.4"/>
  <path d="M108 294 L117 294" stroke="#5d3a0a" stroke-width="1.4"/>
  <circle cx="113" cy="277" r="2.3" fill="#f4d063"/>

  <path d="M97 304 Q92 313 100 313 L122 313 Q126 313 122 305 Z" fill="url(#m-leather)"/>
  <path d="M105 305 L108 311" stroke="#2c1b0c" stroke-width="1.5"/>
  <path d="M114 305 L117 311" stroke="#2c1b0c" stroke-width="1.5"/>

  <path d="M99 215 L154 215 L156 240 Q127 252 96 240 Z" fill="#e8d8b0"/>
  <path d="M104 218 L106 246" stroke="#a08862" stroke-width="1.2" opacity="0.7"/>
  <path d="M127 218 L127 250" stroke="#a08862" stroke-width="1.2" opacity="0.7"/>
  <path d="M148 218 L146 246" stroke="#a08862" stroke-width="1.2" opacity="0.7"/>

  <path d="M98 220 L104 245 L97 247 Q94 234 96 222 Z" fill="url(#m-leather)"/>
  <path d="M105 222 L108 248 L98 248 L102 222 Z" fill="url(#m-red)" opacity="0.85"/>
  <path d="M113 222 L116 250 L106 250 L110 222 Z" fill="url(#m-leather)"/>
  <path d="M122 222 L123 252 L114 252 L117 222 Z" fill="url(#m-red)" opacity="0.85"/>
  <path d="M130 222 L131 252 L122 252 L124 222 Z" fill="url(#m-leather)"/>
  <path d="M139 222 L140 250 L130 250 L131 222 Z" fill="url(#m-red)" opacity="0.85"/>
  <path d="M146 222 L148 248 L139 250 L138 222 Z" fill="url(#m-leather)"/>
  <path d="M153 222 L156 247 L147 248 L145 222 Z" fill="url(#m-red)" opacity="0.85"/>

  <path d="M98 210 L156 210 L158 222 Q127 232 96 222 Z" fill="url(#m-leather)"/>
  <path d="M101 215 Q127 222 154 215" stroke="#3a2207" stroke-width="1.6" fill="none"/>
  <rect x="119" y="211" width="16" height="11" rx="1.6" fill="url(#m-bronze-lit)"/>
  <rect x="121" y="213" width="12" height="7" rx="1" fill="none" stroke="#3a2207" stroke-width="1.1"/>

  <g data-bone="torso">

    <g data-bone="arm-l">
      <path d="M115 152 Q102 156 91 170 L99 181 Q108 174 119 167 Z" fill="url(#m-skin)"/>
      <path d="M104 154 Q108 161 113 158 Q110 152 105 154 Z" fill="url(#m-leather)"/>

      <g data-bone="forearm-l">
        <path d="M93 173 Q83 184 75 200 L86 207 Q94 195 102 184 Z" fill="url(#m-skin)"/>
        <path d="M73 198 Q70 203 72 209 L80 211 Q82 204 80 198 Z" fill="url(#m-skin)"/>

        <path d="M48 142 Q40 158 39 192 Q40 226 50 246 Q66 256 88 246 Q98 224 98 192 Q97 158 90 142 Q70 134 48 142 Z" fill="url(#m-red)"/>
        <path d="M50 145 Q44 161 43 192 Q44 222 53 240 Q70 250 86 240 Q94 222 94 192 Q93 161 87 146 Q70 138 50 145 Z" fill="url(#m-red-lit)" opacity="0.55"/>
        <path d="M48 142 Q40 158 39 192 Q40 226 50 246 Q66 256 88 246 Q98 224 98 192 Q97 158 90 142 Q70 134 48 142 Z" fill="none" stroke="url(#m-bronze)" stroke-width="3.2"/>
        <path d="M68 142 L68 248" stroke="#3a1108" stroke-width="2" opacity="0.55"/>
        <path d="M44 168 Q68 162 92 168" stroke="#e6c053" stroke-width="1.6" opacity="0.6" fill="none"/>
        <path d="M42 220 Q68 226 94 220" stroke="#e6c053" stroke-width="1.6" opacity="0.6" fill="none"/>
        <path d="M58 158 L62 174 L56 178 L66 196" stroke="#f4d063" stroke-width="1.6" fill="none" opacity="0.7"/>
        <path d="M76 158 L72 174 L78 178 L70 196" stroke="#f4d063" stroke-width="1.6" fill="none" opacity="0.7"/>
        <path d="M58 220 L62 232 L56 236 L66 246" stroke="#f4d063" stroke-width="1.4" fill="none" opacity="0.6"/>
        <path d="M76 220 L72 232 L78 236 L70 246" stroke="#f4d063" stroke-width="1.4" fill="none" opacity="0.6"/>
        <ellipse cx="68" cy="194" rx="15" ry="14" fill="url(#m-shield-boss)"/>
        <ellipse cx="68" cy="194" rx="15" ry="14" fill="none" stroke="#3a2207" stroke-width="1.4"/>
        <ellipse cx="64" cy="190" rx="4" ry="3" fill="#f7df7c" opacity="0.7"/>
      </g>
    </g>

    <path d="M105 148 Q126 138 148 148 L154 215 Q127 226 100 215 Z" fill="url(#m-bronze)"/>
    <path d="M105 148 Q126 138 148 148 L154 215 Q127 226 100 215 Z" fill="none"/>
    <path d="M109 162 Q120 156 124 168 Q120 174 113 172 Q108 168 109 162 Z" fill="none" stroke="#5d3a0a" stroke-width="1.3"/>
    <path d="M144 162 Q133 156 129 168 Q133 174 140 172 Q145 168 144 162 Z" fill="none" stroke="#5d3a0a" stroke-width="1.3"/>
    <path d="M126 150 L126 200" stroke="#7a5511" stroke-width="1.4" opacity="0.55"/>
    <path d="M111 184 Q126 188 142 184" stroke="#5d3a0a" stroke-width="1.4" fill="none"/>
    <path d="M110 196 Q126 200 143 196" stroke="#5d3a0a" stroke-width="1.4" fill="none"/>
    <path d="M108 207 Q126 212 145 207" stroke="#5d3a0a" stroke-width="1.4" fill="none"/>
    <path d="M104 148 Q97 142 92 152 L101 162 Z" fill="url(#m-bronze-lit)"/>
    <path d="M148 148 Q155 142 160 152 L151 162 Z" fill="url(#m-bronze-lit)"/>
    <path d="M120 152 L122 210" stroke="#f4d063" stroke-width="1.5" opacity="0.4"/>

    <path d="M118 132 L137 132 L139 148 L116 148 Z" fill="url(#m-skin)"/>
    <path d="M116 144 Q127 148 139 144" stroke="#5d3617" stroke-width="1.3" fill="none" opacity="0.55"/>

    <g data-bone="arm-r">
      <path d="M138 152 Q156 156 168 174 L160 184 Q150 178 142 168 Z" fill="url(#m-skin)"/>
      <path d="M141 153 Q156 156 167 172 L165 175 Q151 168 141 158 Z" fill="url(#m-iron)"/>
      <path d="M143 162 Q157 168 167 175" stroke="#444b4b" stroke-width="1.2" fill="none" opacity="0.7"/>
      <path d="M147 170 Q160 174 167 178" stroke="#444b4b" stroke-width="1.2" fill="none" opacity="0.7"/>
      <path d="M139 148 Q150 144 157 152 L152 158 Q145 154 139 152 Z" fill="url(#m-bronze-lit)"/>

      <g data-bone="forearm-r">
        <path d="M161 182 Q172 196 176 214 L164 218 Q158 200 156 188 Z" fill="url(#m-skin)"/>
        <path d="M161 184 Q170 196 174 213 L168 215 Q160 198 158 188 Z" fill="url(#m-iron)" opacity="0.92"/>
        <path d="M161 192 Q170 197 173 200" stroke="#3a3f40" stroke-width="1.2" fill="none" opacity="0.7"/>
        <path d="M163 202 Q172 207 174 210" stroke="#3a3f40" stroke-width="1.2" fill="none" opacity="0.7"/>

        <path d="M163 215 Q160 224 167 228 L178 226 Q180 218 176 213 Z" fill="url(#m-skin)"/>
        <path d="M168 220 L176 219" stroke="#5d3617" stroke-width="1.3" opacity="0.6"/>

        <ellipse cx="171" cy="216" rx="5" ry="3.5" fill="url(#m-bronze-lit)"/>
        <ellipse cx="171" cy="216" rx="5" ry="3.5" fill="none" stroke="#3a2207" stroke-width="1.2"/>
        <rect x="167" y="218" width="9" height="14" rx="1.2" fill="url(#m-leather)"/>
        <path d="M168 222 L175 222" stroke="#3a2207" stroke-width="0.9"/>
        <path d="M168 226 L175 226" stroke="#3a2207" stroke-width="0.9"/>
        <path d="M161 232 L182 232 L181 238 L162 238 Z" fill="url(#m-bronze-lit)"/>
        <path d="M161 232 L182 232 L181 238 L162 238 Z" fill="none" stroke="#3a2207" stroke-width="1.2"/>
        <path d="M167 238 Q166 268 170 296 Q172 300 174 296 Q177 268 175 238 Z" fill="url(#m-iron)"/>
        <path d="M167 238 Q166 268 170 296 Q172 300 174 296 Q177 268 175 238 Z" fill="none" stroke="#1f130a" stroke-width="1.3"/>
        <path d="M171 240 L171 292" stroke="#eef0ea" stroke-width="1" opacity="0.6"/>
      </g>
    </g>

    <g data-bone="head">
      <path d="M99 113 Q98 91 112 82 Q126 73 142 83 Q156 93 156 114 L153 132 Q142 144 122 144 Q104 142 99 130 Z" fill="url(#m-bronze)"/>
      <path d="M99 113 Q98 91 112 82 Q126 73 142 83 Q156 93 156 114 L153 132 Q142 144 122 144 Q104 142 99 130 Z" fill="none"/>
      <path d="M104 96 Q116 86 132 86" stroke="#f4d063" stroke-width="2" fill="none" opacity="0.6"/>

      <path d="M104 86 Q126 78 152 86 L152 92 Q126 86 104 92 Z" fill="url(#m-bronze-lit)"/>

      <path d="M106 86 Q108 64 116 60 Q120 64 118 84 Z" fill="url(#m-red)"/>
      <path d="M118 84 Q118 56 126 50 Q132 56 130 82 Z" fill="url(#m-red-lit)"/>
      <path d="M130 82 Q130 52 140 50 Q146 56 144 84 Z" fill="url(#m-red)"/>
      <path d="M144 84 Q144 60 150 58 Q154 64 152 86 Z" fill="url(#m-red-lit)"/>
      <path d="M110 80 Q114 64 116 78" stroke="#f17050" stroke-width="0.9" fill="none" opacity="0.7"/>
      <path d="M122 78 Q126 58 130 78" stroke="#f17050" stroke-width="0.9" fill="none" opacity="0.7"/>
      <path d="M134 78 Q138 58 142 78" stroke="#f17050" stroke-width="0.9" fill="none" opacity="0.7"/>
      <path d="M146 80 Q150 62 152 80" stroke="#f17050" stroke-width="0.9" fill="none" opacity="0.7"/>

      <path d="M101 109 Q101 100 110 96 Q126 92 144 96 Q154 100 154 110 L154 130 Q142 140 124 140 Q106 138 101 130 Z" fill="url(#m-bronze)"/>
      <path d="M101 109 Q101 100 110 96 Q126 92 144 96 Q154 100 154 110 L154 130 Q142 140 124 140 Q106 138 101 130 Z" fill="none" stroke="#3a2207" stroke-width="1.5"/>

      <ellipse cx="115" cy="113" rx="6" ry="3.5" fill="#0d0b08"/>
      <ellipse cx="139" cy="113" rx="6" ry="3.5" fill="#0d0b08"/>
      <path d="M115 109 L115 117" stroke="#3a2207" stroke-width="1.4"/>
      <path d="M139 109 L139 117" stroke="#3a2207" stroke-width="1.4"/>

      <path d="M124 108 L124 132 L128 132 L128 108 Z" fill="url(#m-bronze-lit)"/>
      <path d="M126 108 L126 132" stroke="#7a5511" stroke-width="0.8" opacity="0.7"/>

      <path d="M108 122 L120 122" stroke="#3a2207" stroke-width="1.5"/>
      <path d="M134 122 L146 122" stroke="#3a2207" stroke-width="1.5"/>
      <path d="M107 128 L121 128" stroke="#3a2207" stroke-width="1.4"/>
      <path d="M133 128 L147 128" stroke="#3a2207" stroke-width="1.4"/>

      <path d="M106 134 Q126 142 146 134" stroke="#7a5511" stroke-width="1.6" fill="none"/>
    </g>
  </g>
</g>
</svg>`;
}

export const murmilloBones: BoneDef[] = [
  { name: "root", px: 126, py: 222 },
  { name: "torso", px: 126, py: 218 },
  { name: "arm-l", px: 108, py: 158 },
  { name: "forearm-l", px: 88, py: 180 },
  { name: "arm-r", px: 144, py: 160 },
  { name: "forearm-r", px: 162, py: 184 },
  { name: "head", px: 126, py: 143 },
];
