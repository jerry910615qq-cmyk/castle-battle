/* 純手繪 SVG 中世紀城堡，不依賴任何外部圖片 */

function Merlons({ x, y, width, fill, count, mW = 8, mH = 14, gW = 6 }) {
  const step = mW + gW;
  const totalW = count * step - gW;
  const sx = x + (width - totalW) / 2;
  return Array.from({ length: count }, (_, i) => (
    <rect key={i} x={sx + i * step} y={y} width={mW} height={mH} fill={fill} rx="1.5" />
  ));
}

function ArchWindow({ cx, cy, w = 12, h = 20, fill, stroke, sW = 1.5 }) {
  const r = w / 2;
  return (
    <path
      d={`M ${cx - r},${cy + h} L ${cx - r},${cy + r} A ${r},${r} 0 0,1 ${cx + r},${cy + r} L ${cx + r},${cy + h} Z`}
      fill={fill} stroke={stroke} strokeWidth={sW}
    />
  );
}

function Slit({ cx, cy, fill }) {
  return (
    <g>
      <rect x={cx - 1.5} y={cy}     width={3} height={13} rx="1.5" fill={fill} />
      <rect x={cx - 4}   y={cy + 4} width={8} height={3}  rx="1"   fill={fill} />
    </g>
  );
}

function StoneLines({ x, y, w, h, stroke, sp = 15 }) {
  const lines = [];
  for (let ly = y + sp; ly < y + h; ly += sp)
    lines.push(<line key={ly} x1={x} y1={ly} x2={x + w} y2={ly} stroke={stroke} strokeWidth="0.7" opacity="0.45" />);
  return <>{lines}</>;
}

function Flag({ x, y, tcL }) {
  return (
    <>
      <line x1={x} y1={y} x2={x} y2={y + 18} stroke={tcL} strokeWidth="1.8" />
      <polygon points={`${x},${y + 1} ${x + 14},${y + 6} ${x},${y + 11}`} fill={tcL} />
    </>
  );
}

export default function CastleSVG({ color, flip, hp = 100, maxHp = 100, size, fillHeight = false }) {
  const ratio = Math.max(0, hp) / maxHp;
  const isBlue = color === '#185FA5';
  const id = isBlue ? 'b' : 'r';

  const tc   = isBlue ? '#1a6abf' : '#bf2020';
  const tcD  = isBlue ? '#0e3d72' : '#7a0f0f';
  const tcDD = isBlue ? '#06203e' : '#3f0606';
  const tcM  = isBlue ? '#2580d8' : '#d83030';
  const tcL  = isBlue ? '#60b0ff' : '#ff6060';

  const W = 200, H = 305;

  // fillHeight: 高度撐滿父容器 | size: 固定像素寬 | 否則: 100% 響應式
  const containerStyle = fillHeight
    ? { height: '100%', display: 'inline-flex', alignItems: 'flex-end', lineHeight: 0 }
    : { display: 'block', lineHeight: 0, width: '100%' };

  const svgStyle = {
    display: 'block',
    transform: flip ? 'scaleX(-1)' : 'none',
    opacity: ratio <= 0 ? 0.25 : 1,
    ...(fillHeight
      ? { height: '100%', width: 'auto' }
      : size
        ? { width: size, height: size * (H / W) }
        : { width: '100%', height: 'auto' }),
  };

  return (
    <div style={containerStyle}>
      <svg viewBox={`0 0 ${W} ${H}`} style={svgStyle} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`wg-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={tcM} />
            <stop offset="100%" stopColor={tcD} />
          </linearGradient>
          <linearGradient id={`sd-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={tcL}  stopOpacity="0.18" />
            <stop offset="55%"  stopColor={tc}   stopOpacity="0" />
            <stop offset="100%" stopColor={tcDD} stopOpacity="0.32" />
          </linearGradient>
          <linearGradient id={`kg-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={tcL}  stopOpacity="0.14" />
            <stop offset="50%"  stopColor={tc}   stopOpacity="0" />
            <stop offset="100%" stopColor={tcDD} stopOpacity="0.28" />
          </linearGradient>
        </defs>

        {/* ── 地面 ── */}
        <rect x="0"  y="294" width="200" height="11" fill={tcDD} rx="2" />
        <rect x="0"  y="291" width="200" height="4"  fill={tcD}  opacity="0.6" />

        {/* ── 左側連接牆 ── x=48-72, y=192-294 */}
        <rect x="48" y="192" width="24" height="102" fill={`url(#wg-${id})`} />
        <rect x="48" y="192" width="24" height="102" fill={`url(#sd-${id})`} />
        <StoneLines x={48} y={192} w={24} h={102} stroke={tcD} />
        <rect x="48" y="180" width="24" height="13"  fill={tc} />
        <Merlons x={48} y={167} width={24} fill={tc} count={2} mW={7} gW={5} mH={14} />

        {/* ── 右側連接牆 ── x=128-152, y=192-294 */}
        <rect x="128" y="192" width="24" height="102" fill={`url(#wg-${id})`} />
        <rect x="128" y="192" width="24" height="102" fill={`url(#sd-${id})`} />
        <StoneLines x={128} y={192} w={24} h={102} stroke={tcD} />
        <rect x="128" y="180" width="24" height="13"  fill={tc} />
        <Merlons x={128} y={167} width={24} fill={tc} count={2} mW={7} gW={5} mH={14} />

        {/* ── 城門 ── center=100, arch y=212-294, width=40 */}
        {/* 門洞 */}
        <rect x="80" y="226" width="40" height="68" fill={tcDD} />
        <path d="M 80,226 A 20,20 0 0,1 120,226 Z" fill={tcDD} />
        {/* 閘門格柵 */}
        {[86, 93, 100, 107, 114].map(bx => (
          <line key={`gv${bx}`} x1={bx} y1={226} x2={bx} y2={294} stroke={tcD} strokeWidth="2" opacity="0.55" />
        ))}
        {[234, 244, 254, 264, 274, 284].map(by => (
          <line key={`gh${by}`} x1={80} y1={by} x2={120} y2={by} stroke={tcD} strokeWidth="1.5" opacity="0.55" />
        ))}
        {/* 門框 */}
        <path d="M 78,228 A 22,22 0 0,1 122,228 L 122,294 L 78,294 Z"
          fill="none" stroke={tcD} strokeWidth="2.5" strokeLinejoin="round" />
        {/* 門框圓角 highlight */}
        <path d="M 80,226 A 20,20 0 0,1 120,226"
          fill="none" stroke={tcL} strokeWidth="1" opacity="0.3" />

        {/* ── 左主塔 ── x=0-50, y=88-294 */}
        <rect x="0"  y="88"  width="50" height="206" fill={`url(#wg-${id})`} />
        <rect x="0"  y="88"  width="50" height="206" fill={`url(#sd-${id})`} />
        <StoneLines x={0} y={88} w={50} h={206} stroke={tcD} />
        {/* 左塔垛口 */}
        <rect x="0"  y="74"  width="50" height="16" fill={tc} />
        <Merlons x={0} y={59} width={50} fill={tc} count={5} mW={7} gW={5} mH={16} />
        {/* 左塔射箭孔 + 窗 */}
        <ArchWindow cx={25} cy={104} w={12} h={20} fill={tcDD} stroke={tcD} sW={1} />
        <Slit cx={25} cy={148} fill={tcDD} />
        <ArchWindow cx={25} cy={183} w={12} h={20} fill={tcDD} stroke={tcD} sW={1} />
        <Slit cx={25} cy={232} fill={tcDD} />
        {/* 左塔邊緣線 */}
        <line x1="50" y1="88" x2="50" y2="294" stroke={tcD} strokeWidth="1.8" opacity="0.45" />

        {/* ── 右主塔 ── x=150-200, y=88-294 */}
        <rect x="150" y="88"  width="50" height="206" fill={`url(#wg-${id})`} />
        <rect x="150" y="88"  width="50" height="206" fill={`url(#sd-${id})`} />
        <StoneLines x={150} y={88} w={50} h={206} stroke={tcD} />
        <rect x="150" y="74"  width="50" height="16" fill={tc} />
        <Merlons x={150} y={59} width={50} fill={tc} count={5} mW={7} gW={5} mH={16} />
        <ArchWindow cx={175} cy={104} w={12} h={20} fill={tcDD} stroke={tcD} sW={1} />
        <Slit cx={175} cy={148} fill={tcDD} />
        <ArchWindow cx={175} cy={183} w={12} h={20} fill={tcDD} stroke={tcD} sW={1} />
        <Slit cx={175} cy={232} fill={tcDD} />
        <line x1="150" y1="88" x2="150" y2="294" stroke={tcD} strokeWidth="1.8" opacity="0.45" />

        {/* ── 中央主堡（最高）── x=68-132, y=24-294 */}
        <rect x="68" y="24"  width="64" height="270" fill={`url(#wg-${id})`} />
        <rect x="68" y="24"  width="64" height="270" fill={`url(#kg-${id})`} />
        <StoneLines x={68} y={24} w={64} h={270} stroke={tcD} sp={14} />
        {/* 主堡垛口 */}
        <rect x="68" y="10"  width="64" height="16"  fill={tc} />
        <Merlons x={68} y={-2} width={64} fill={tc} count={6} mW={7} gW={5} mH={13} />
        {/* 主堡窗戶 */}
        <ArchWindow cx={100} cy={40}  w={14} h={24} fill={tcDD} stroke={tcD} sW={1.2} />
        <ArchWindow cx={83}  cy={88}  w={11} h={18} fill={tcDD} stroke={tcD} sW={1} />
        <ArchWindow cx={117} cy={88}  w={11} h={18} fill={tcDD} stroke={tcD} sW={1} />
        {/* 玫瑰窗 */}
        <circle cx={100} cy={140} r={11}  fill={tcDD} />
        <circle cx={100} cy={140} r={7}   fill={tcD} />
        <circle cx={100} cy={140} r={3}   fill={tcDD} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => {
          const rad = deg * Math.PI / 180;
          return (
            <line key={deg}
              x1={100 + 3.5 * Math.cos(rad)} y1={140 + 3.5 * Math.sin(rad)}
              x2={100 + 10 * Math.cos(rad)}  y2={140 + 10 * Math.sin(rad)}
              stroke={tcM} strokeWidth="1.2" opacity="0.9"
            />
          );
        })}
        <ArchWindow cx={100} cy={172} w={14} h={24} fill={tcDD} stroke={tcD} sW={1.2} />
        {/* 主堡側邊線 */}
        <line x1="68"  y1="24" x2="68"  y2="294" stroke={tcD} strokeWidth="1.5" opacity="0.4" />
        <line x1="132" y1="24" x2="132" y2="294" stroke={tcD} strokeWidth="1.5" opacity="0.4" />

        {/* ── 旗幟 ── */}
        <Flag x={25}  y={52}  tcL={tcL} />
        <Flag x={175} y={52}  tcL={tcL} />
        <Flag x={100} y={-3}  tcL={tcL} />

        {/* ── 裝飾：塔基石 ── */}
        <rect x="0"   y="286" width="50"  height="8" rx="1" fill={tcD} opacity="0.5" />
        <rect x="150" y="286" width="50"  height="8" rx="1" fill={tcD} opacity="0.5" />
        <rect x="68"  y="286" width="64"  height="8" rx="1" fill={tcD} opacity="0.5" />

        {/* ── 傷害效果 ── */}
        {ratio <= 0.4 && ratio > 0.15 && (
          <rect x="0" y="0" width="200" height="305" fill="rgba(120,0,0,0.20)" />
        )}
        {ratio <= 0.15 && ratio > 0 && (
          <>
            <rect x="0" y="0" width="200" height="305" fill="rgba(140,0,0,0.38)" />
            <text x="100" y="178" textAnchor="middle" fontSize="38">🔥🔥</text>
          </>
        )}
        {ratio <= 0 && (
          <text x="100" y="170" textAnchor="middle" fontSize="54">💀</text>
        )}
      </svg>
    </div>
  );
}
