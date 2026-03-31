import React from 'react';
import { motion } from 'motion/react';

const InfiniteSlider = ({ items, duration = 30, reverse = false }) => {
  return (
    <div className="relative flex overflow-hidden py-2 w-full">
      <motion.div
        className="flex gap-16 sm:gap-24 flex-nowrap shrink-0 items-center justify-start p-4"
        initial={{ x: reverse ? "-50%" : "0%" }}
        animate={{ x: reverse ? "0%" : "-50%" }}
        transition={{
          repeat: Infinity,
          duration: duration,
          ease: "linear",
          repeatType: "loop"
        }}
      >
        {/* Double the items to create the infinite loop effect seamlessly */}
        {[...items, ...items].map((item, i) => (
          <div key={i} className="flex shrink-0 items-center justify-center min-w-[120px] filter brightness-0 invert">
             <img 
               src={item.src} 
               alt={item.alt} 
               className="h-8 sm:h-10 w-auto opacity-70 hover:opacity-100 transition-opacity duration-300" 
             />
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export default InfiniteSlider;
