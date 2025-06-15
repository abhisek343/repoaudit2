import React from 'react';
import { cn } from '../../lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  visible: boolean;
  position?: {
    x: number;
    y: number;
  };
  className?: string;
  children?: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  visible,
  position = { x: 0, y: 0 },
  className,
  children
}) => {
  if (!visible) return children ? <>{children}</> : null;

  return (
    <>
      {children}
      <div
        className={cn(
          "fixed z-50 max-w-xs p-2 text-sm bg-gray-900 text-white rounded-lg shadow-lg pointer-events-none",
          "transform -translate-x-1/2 -translate-y-full mb-2",
          className
        )}
        style={{
          left: position.x,
          top: position.y - 8,
        }}
      >
        {content}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
      </div>
    </>
  );
};

interface TooltipTriggerProps {
  tooltip: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const TooltipTrigger: React.FC<TooltipTriggerProps> = ({
  tooltip,
  children,
  className,
  delay = 500
}) => {
  const [visible, setVisible] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top
    });

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setVisible(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
      <Tooltip
        content={tooltip}
        visible={visible}
        position={position}
      />
    </>
  );
};

export default Tooltip;
