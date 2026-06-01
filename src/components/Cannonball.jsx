import { motion, AnimatePresence } from 'framer-motion';

export default function Cannonball({ fire, fromRight }) {
  return (
    <AnimatePresence>
      {fire && (
        <motion.div
          key={Date.now()}
          initial={{ x: fromRight ? 300 : -300, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: fromRight ? -300 : 300, y: -30, opacity: 0, scale: 0.5 }}
          exit={{}}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: fromRight ? '#A32D2D' : '#185FA5',
            boxShadow: `0 0 12px 4px ${fromRight ? '#ff6060' : '#60aaff'}`,
            pointerEvents: 'none',
            zIndex: 50,
          }}
        />
      )}
    </AnimatePresence>
  );
}
