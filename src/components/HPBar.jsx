import { motion } from 'framer-motion';

export default function HPBar({ hp, color, label, flip }) {
  const pct = Math.max(0, hp);
  const barColor = pct > 50 ? color : pct > 25 ? '#f59e0b' : '#ef4444';

  return (
    <div className={`flex flex-col gap-1 ${flip ? 'items-end' : 'items-start'} w-full`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-white/70">{label}</span>
        <span className="text-sm font-bold" style={{ color: barColor }}>{hp} HP</span>
      </div>
      <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
