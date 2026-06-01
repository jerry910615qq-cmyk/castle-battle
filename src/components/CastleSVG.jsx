export default function CastleSVG({ color, flip, hp = 100, maxHp = 100, shake, size = 180 }) {
  const ratio = Math.max(0, hp) / maxHp;
  const damaged = ratio <= 0.4;
  const critical = ratio <= 0.15;
  const dark = shade(color, -28);
  const light = shade(color, 22);

  return (
    <svg
      viewBox="0 0 160 180"
      width={size}
      height={(size * 180) / 160}
      style={{
        transform: flip ? 'scaleX(-1)' : 'none',
        filter: shake ? `drop-shadow(0 0 14px ${color})` : 'drop-shadow(0 6px 8px rgba(80,55,20,.25))',
        transition: 'filter .3s',
      }}
    >
      {/* 草地基座 */}
      <ellipse cx="80" cy="172" rx="74" ry="9" fill="#cdbb8a" opacity="0.55" />

      {/* 側翼旗幟桿 */}
      <line x1="18" y1="60" x2="18" y2="20" stroke="#8a6b3a" strokeWidth="2.5" />
      <polygon points="18,22 40,30 18,38" fill={color} />
      <line x1="142" y1="60" x2="142" y2="20" stroke="#8a6b3a" strokeWidth="2.5" />
      <polygon points="142,22 120,30 142,38" fill={color} />

      {/* 主城牆 */}
      <rect x="14" y="78" width="132" height="84" rx="3" fill={color} />
      <rect x="14" y="78" width="132" height="10" fill={light} opacity="0.6" />
      {/* 城牆石紋 */}
      {[96, 112, 128, 144].map((y) => (
        <line key={y} x1="16" y1={y} x2="144" y2={y} stroke={dark} strokeWidth="1" opacity="0.35" />
      ))}
      {/* 牆面城垛 */}
      {[14, 33, 52, 90, 109, 128].map((x) => (
        <rect key={x} x={x} y="68" width="13" height="16" rx="1.5" fill={color} />
      ))}

      {/* 左右側塔 */}
      {[{ x: 8 }, { x: 124 }].map(({ x }) => (
        <g key={x}>
          <rect x={x} y="48" width="28" height="114" rx="3" fill={dark} />
          {[x, x + 9, x + 18].map((cx) => (
            <rect key={cx} x={cx} y="38" width="7" height="14" rx="1.5" fill={dark} />
          ))}
          {/* 塔頂錐 */}
          <polygon points={`${x},38 ${x + 14},20 ${x + 28},38`} fill={shade(color, -45)} />
          {/* 塔窗 */}
          <rect x={x + 10} y="70" width="8" height="14" rx="4" fill="#1c2433" opacity="0.85" />
          {/* 小旗 */}
          <line x1={x + 14} y1="20" x2={x + 14} y2="10" stroke="#fff8" strokeWidth="1.5" />
          <polygon points={`${x + 14},10 ${x + 24},14 ${x + 14},18`} fill="#f2d35a" />
        </g>
      ))}

      {/* 中央主塔 */}
      <rect x="56" y="40" width="48" height="120" rx="3" fill={shade(color, -12)} />
      {[56, 68, 80, 92].map((cx) => (
        <rect key={cx} x={cx} y="30" width="9" height="14" rx="1.5" fill={shade(color, -12)} />
      ))}
      {/* 主塔石紋 */}
      {[60, 78, 96, 114, 132].map((y) => (
        <line key={y} x1="58" y1={y} x2="102" y2={y} stroke={dark} strokeWidth="1" opacity="0.4" />
      ))}

      {/* 騎馬騎士旗（塔頂） */}
      <line x1="80" y1="30" x2="80" y2="6" stroke="#8a6b3a" strokeWidth="2.5" />
      <rect x="80" y="6" width="30" height="20" rx="2" fill={color} stroke={dark} strokeWidth="1" />
      <text x="95" y="22" textAnchor="middle" fontSize="15">🏇</text>

      {/* 盾牌裝飾 */}
      {[{ x: 30, y: 108 }, { x: 124, y: 108 }].map(({ x, y }) => (
        <g key={x}>
          <path d={`M${x} ${y} h14 v8 q0 8 -7 12 q-7 -4 -7 -12 z`} fill="#e7d8b3" stroke={dark} strokeWidth="1.2" />
          <line x1={x + 7} y1={y} x2={x + 7} y2={y + 18} stroke={dark} strokeWidth="1" />
          <line x1={x} y1={y + 6} x2={x + 14} y2={y + 6} stroke={dark} strokeWidth="1" />
        </g>
      ))}

      {/* 火炬 */}
      {[24, 136].map((x) => (
        <g key={x}>
          <rect x={x - 1.5} y="120" width="3" height="14" fill="#7a5a2a" />
          <circle cx={x} cy="118" r="4.5" fill="#ffb24d" />
          <circle cx={x} cy="116" r="2.5" fill="#ffe08a" />
        </g>
      ))}

      {/* 拱門城門 */}
      <path d="M66 162 v-22 a14 14 0 0 1 28 0 v22 z" fill="#2a1d12" />
      <path d="M66 162 v-22 a14 14 0 0 1 28 0 v22" fill="none" stroke="#8a6b3a" strokeWidth="2" />
      <line x1="80" y1="140" x2="80" y2="162" stroke="#8a6b3a" strokeWidth="1.5" opacity="0.7" />

      {/* 受損裂痕 */}
      {damaged && (
        <>
          <polyline points="30,82 38,100 32,118" fill="none" stroke="#1c2433" strokeWidth="1.6" opacity="0.5" />
          <polyline points="120,80 112,96 118,114" fill="none" stroke="#1c2433" strokeWidth="1.6" opacity="0.5" />
        </>
      )}
      {critical && <text x="80" y="60" textAnchor="middle" fontSize="20">🔥</text>}
    </svg>
  );
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 0xff) + amt, b = (n & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
