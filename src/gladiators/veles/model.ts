import type { BoneDef } from "../../animation/skeletonTypes";

/**
 * Arena-scale Veles SVG.
 *
 * Light skirmisher silhouette: three throwing spears, short sword, leather
 * straps and a narrow stance. The weapon groups are intentionally readable at
 * small arena scale and can be hidden as each spear is thrown.
 */
export function createVelesSvg(): string {
  return /* html */ `
<svg viewBox="0 0 280 360" fill="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">
<defs>
  <linearGradient id="v-sand-shadow" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#2a1b10" stop-opacity="0"/>
    <stop offset="50%" stop-color="#2a1b10" stop-opacity="0.32"/>
    <stop offset="100%" stop-color="#2a1b10" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="v-skin" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#d99e68"/>
    <stop offset="100%" stop-color="#875129"/>
  </linearGradient>
  <linearGradient id="v-skin-shade" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#a96c3d"/>
    <stop offset="100%" stop-color="#583315"/>
  </linearGradient>
  <linearGradient id="v-bronze" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#e8c45c"/>
    <stop offset="48%" stop-color="#a8781c"/>
    <stop offset="100%" stop-color="#5b3909"/>
  </linearGradient>
  <linearGradient id="v-bronze-lit" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#f4d875"/>
    <stop offset="100%" stop-color="#7b5510"/>
  </linearGradient>
  <linearGradient id="v-steel" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#ededdf"/>
    <stop offset="45%" stop-color="#848b89"/>
    <stop offset="100%" stop-color="#2d3333"/>
  </linearGradient>
  <linearGradient id="v-leather" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#7d5429"/>
    <stop offset="100%" stop-color="#33200f"/>
  </linearGradient>
  <linearGradient id="v-cloth" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#d8c277"/>
    <stop offset="100%" stop-color="#6f5c25"/>
  </linearGradient>
  <linearGradient id="v-green" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#3f7d62"/>
    <stop offset="100%" stop-color="#1a3d32"/>
  </linearGradient>
  <linearGradient id="v-wood" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="#3b2310"/>
    <stop offset="50%" stop-color="#9b7040"/>
    <stop offset="100%" stop-color="#35200d"/>
  </linearGradient>
  <filter id="v-soft-outline" x="-22%" y="-22%" width="144%" height="144%">
    <feDropShadow dx="0" dy="2" stdDeviation="0.6" flood-color="#1e1209" flood-opacity="0.55"/>
  </filter>
</defs>

<ellipse cx="138" cy="318" rx="58" ry="12" fill="url(#v-sand-shadow)"/>

<g data-bone="root" filter="url(#v-soft-outline)" stroke="#21140a" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round">
  <path d="M143 226 Q149 252 154 270 Q158 286 158 299 L173 297 Q173 280 170 264 Q166 244 160 226 Z" fill="url(#v-skin-shade)"/>
  <path d="M155 298 Q151 310 158 313 L174 313 Q178 309 174 299 Z" fill="url(#v-leather)"/>
  <path d="M162 301 L164 310" stroke="#2c1b0c" stroke-width="1.3"/>
  <path d="M168 301 L170 310" stroke="#2c1b0c" stroke-width="1.3"/>

  <path d="M119 226 Q115 252 109 270 Q104 286 104 299 L120 299 Q121 282 124 264 Q128 244 134 226 Z" fill="url(#v-skin)"/>
  <path d="M105 298 Q101 310 108 313 L124 313 Q128 309 122 299 Z" fill="url(#v-leather)"/>
  <path d="M111 301 L113 310" stroke="#2c1b0c" stroke-width="1.3"/>
  <path d="M118 301 L120 310" stroke="#2c1b0c" stroke-width="1.3"/>

  <path d="M108 212 L170 212 L174 235 Q140 248 104 235 Z" fill="url(#v-cloth)"/>
  <path d="M111 218 L114 241" stroke="#866f35" stroke-width="1.1" opacity="0.62"/>
  <path d="M125 218 L125 246" stroke="#866f35" stroke-width="1.1" opacity="0.58"/>
  <path d="M140 218 L140 248" stroke="#866f35" stroke-width="1.1" opacity="0.62"/>
  <path d="M156 218 L154 244" stroke="#866f35" stroke-width="1.1" opacity="0.58"/>
  <path d="M167 218 L163 241" stroke="#866f35" stroke-width="1.1" opacity="0.62"/>

  <path d="M106 205 L172 205 L174 220 Q140 230 104 220 Z" fill="url(#v-leather)"/>
  <path d="M110 213 Q140 221 170 213" stroke="#3a2207" stroke-width="1.3" fill="none"/>
  <rect x="132" y="206" width="15" height="11" rx="1.4" fill="url(#v-bronze-lit)"/>
  <rect x="134" y="208" width="11" height="7" rx="0.8" fill="none" stroke="#3a2207" stroke-width="1"/>

  <g data-javelin-reserve="3" opacity="0.95">
    <g transform="rotate(-22 139 176)">
      <rect x="136" y="54" width="4.8" height="214" rx="2.4" fill="url(#v-wood)"/>
      <path d="M138.3 54 L138.3 265" stroke="#c49258" stroke-width="1" opacity="0.5"/>
      <path d="M133 52 L143 52 L139 24 Z" fill="url(#v-steel)"/>
      <path d="M138 28 L138 51" stroke="#f1f1e8" stroke-width="0.8" opacity="0.7"/>
      <path d="M134 265 L143 265 L142 274 L135 274 Z" fill="url(#v-bronze)"/>
    </g>
  </g>
  <g data-javelin-reserve="2" opacity="0.95">
    <g transform="rotate(-15 153 178)">
      <rect x="150" y="58" width="4.8" height="210" rx="2.4" fill="url(#v-wood)"/>
      <path d="M152.3 58 L152.3 265" stroke="#c49258" stroke-width="1" opacity="0.5"/>
      <path d="M147 56 L157 56 L153 28 Z" fill="url(#v-steel)"/>
      <path d="M152 32 L152 55" stroke="#f1f1e8" stroke-width="0.8" opacity="0.7"/>
      <path d="M148 265 L157 265 L156 274 L149 274 Z" fill="url(#v-bronze)"/>
    </g>
  </g>

  <g data-bone="torso">
    <path d="M113 146 Q138 135 161 148 L166 205 Q156 219 140 224 Q121 222 112 208 L108 176 Z" fill="url(#v-green)"/>
    <path d="M113 146 Q138 135 161 148 L166 205 Q156 219 140 224 Q121 222 112 208 L108 176 Z" fill="none"/>
    <path d="M119 153 Q139 162 161 154 L162 164 Q139 173 116 164 Z" fill="url(#v-leather)"/>
    <path d="M121 164 L156 216" stroke="#2c1b0c" stroke-width="4.8" opacity="0.72"/>
    <path d="M124 166 L158 214" stroke="#9a6b34" stroke-width="1.4" opacity="0.65"/>
    <circle cx="142" cy="190" r="4" fill="url(#v-bronze-lit)"/>
    <path d="M125 181 Q139 187 154 181" stroke="#18382e" stroke-width="1.3" fill="none" opacity="0.6"/>
    <path d="M125 194 Q139 199 155 194" stroke="#18382e" stroke-width="1.3" fill="none" opacity="0.55"/>
    <path d="M124 206 Q139 212 157 205" stroke="#18382e" stroke-width="1.3" fill="none" opacity="0.5"/>

    <path d="M126 132 L149 132 L151 148 Q137 153 123 147 Z" fill="url(#v-skin)"/>
    <path d="M123 144 Q137 149 151 144" stroke="#5d3617" stroke-width="1.2" fill="none" opacity="0.55"/>

    <g data-bone="arm-l">
      <path d="M114 151 Q100 157 90 172 L99 184 Q109 176 120 168 Z" fill="url(#v-skin)"/>
      <path d="M109 149 Q101 152 97 160 L109 165 Q116 158 121 154 Z" fill="url(#v-bronze)"/>
      <path d="M101 158 Q108 160 116 157" stroke="#f4d875" stroke-width="1.1" fill="none" opacity="0.62"/>

      <g data-bone="forearm-l">
        <path d="M93 174 Q82 187 74 205 L86 211 Q95 197 103 184 Z" fill="url(#v-skin-shade)"/>
        <path d="M83 187 L96 195 Q91 204 86 211 L74 205 Z" fill="url(#v-leather)" opacity="0.88"/>
        <path d="M74 203 Q80 201 87 208 L84 218 Q72 219 68 211 Z" fill="url(#v-skin)"/>
        <path d="M73 211 Q78 210 83 213" stroke="#5d3617" stroke-width="1" fill="none" opacity="0.55"/>

        <g transform="rotate(22 77 216)">
          <rect x="73" y="211" width="8" height="17" rx="1.4" fill="url(#v-leather)"/>
          <path d="M64 226 L92 226 L90 232 L66 232 Z" fill="url(#v-bronze-lit)"/>
          <path d="M76 232 Q73 252 75 270 Q77 274 79 270 Q83 252 80 232 Z" fill="url(#v-steel)"/>
          <path d="M77 235 L77 266" stroke="#f0f0e8" stroke-width="0.8" opacity="0.75"/>
        </g>
      </g>
    </g>

    <g data-bone="arm-r">
      <path d="M158 151 Q172 157 182 173 L173 185 Q163 176 153 167 Z" fill="url(#v-skin)"/>
      <path d="M159 151 Q170 153 177 164 L169 170 Q161 164 154 160 Z" fill="url(#v-bronze)"/>
      <path d="M161 157 Q168 160 174 166" stroke="#f4d875" stroke-width="1.1" fill="none" opacity="0.62"/>

      <g data-bone="forearm-r">
        <path d="M174 176 Q184 158 188 137 L200 141 Q196 163 184 184 Z" fill="url(#v-skin-shade)"/>
        <path d="M178 156 Q185 154 193 152" stroke="#5d3617" stroke-width="1.1" fill="none" opacity="0.55"/>
        <path d="M186 136 Q194 132 202 140 L199 152 Q188 154 184 144 Z" fill="url(#v-skin)"/>
        <path d="M188 143 L197 145" stroke="#5d3617" stroke-width="1" fill="none" opacity="0.6"/>

        <g data-bone="javelin" data-javelin-hand="true" transform="rotate(-7 211 150)">
          <rect x="208" y="44" width="5.2" height="226" rx="2.6" fill="url(#v-wood)"/>
          <path d="M210.5 45 L210.5 266" stroke="#c49258" stroke-width="1" opacity="0.55"/>
          <path d="M205 42 L216 42 L211 10 Z" fill="url(#v-steel)"/>
          <path d="M210 16 L210 41" stroke="#f1f1e8" stroke-width="0.85" opacity="0.75"/>
          <path d="M206 267 L216 267 L214 278 L208 278 Z" fill="url(#v-bronze)"/>
          <path d="M206 263 L216 263" stroke="#5b3909" stroke-width="0.9"/>
        </g>
      </g>
    </g>

    <g data-bone="head">
      <path d="M115 109 Q117 91 129 82 Q143 75 157 84 Q165 94 162 115 L157 134 Q145 145 128 142 Q116 136 115 124 Z" fill="url(#v-skin)"/>
      <path d="M115 109 Q117 91 129 82 Q143 75 157 84 Q165 94 162 115 L157 134 Q145 145 128 142 Q116 136 115 124 Z" fill="none"/>
      <path d="M116 103 Q122 86 137 80 Q153 82 160 102 Q149 97 137 98 Q125 97 116 103 Z" fill="#21140a"/>
      <path d="M118 105 Q130 100 142 101 Q154 101 162 108 L158 116 Q143 111 127 113 Q118 116 114 109 Z" fill="url(#v-leather)"/>
      <path d="M118 106 Q130 103 142 103" stroke="#9b7040" stroke-width="1" fill="none" opacity="0.65"/>
      <ellipse cx="126" cy="121" rx="4.2" ry="2.4" fill="#0d0b08"/>
      <ellipse cx="148" cy="121" rx="4.2" ry="2.4" fill="#0d0b08"/>
      <path d="M121 116 Q126 113 131 116" stroke="#1c130a" stroke-width="1.4" fill="none"/>
      <path d="M143 116 Q148 113 153 116" stroke="#1c130a" stroke-width="1.4" fill="none"/>
      <path d="M136 122 L134 132 L140 133" stroke="#70411d" stroke-width="1.4" fill="none" opacity="0.85"/>
      <path d="M126 136 Q138 141 151 135" stroke="#5e3519" stroke-width="1.6" fill="none"/>
    </g>
  </g>
</g>
</svg>`;
}

export const velesBones: BoneDef[] = [
  { name: "root", px: 138, py: 224 },
  { name: "torso", px: 138, py: 218 },
  { name: "arm-l", px: 114, py: 154 },
  { name: "forearm-l", px: 94, py: 176 },
  { name: "arm-r", px: 158, py: 154 },
  { name: "forearm-r", px: 178, py: 176 },
  { name: "javelin", px: 211, py: 150 },
  { name: "head", px: 138, py: 142 },
];
