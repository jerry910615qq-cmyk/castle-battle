const KEYS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  ['⌫', '0', '✓'],
];

export default function VirtualKeyboard({ onKey, color }) {
  return (
    <div className="grid gap-2">
      {KEYS.map((row, ri) => (
        <div key={ri} className="flex gap-2">
          {row.map((k) => {
            const isConfirm = k === '✓';
            const isDelete = k === '⌫';
            return (
              <button
                key={k}
                onPointerDown={(e) => { e.preventDefault(); onKey(k); }}
                className="flex-1 py-4 rounded-xl text-xl font-bold transition-all active:scale-90 select-none shadow-sm"
                style={
                  isConfirm
                    ? { background: color, color: '#fff', boxShadow: `0 2px 8px ${color}66` }
                    : { background: '#fffdf5', color: 'var(--ink, #4a3b28)', border: '2px solid #d8c290' }
                }
              >
                {isDelete ? '⌫' : k}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
