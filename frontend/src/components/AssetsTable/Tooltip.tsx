import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cloneElement, isValidElement, useState, type ReactNode } from 'react';
import styles from './AssetsTable.module.css';

interface TooltipProps {
  children: ReactNode;
  content?: ReactNode;
  disabled?: boolean;
  open?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function Tooltip({ children, content, disabled = false, open, side = 'top' }: TooltipProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const effectiveOpen = isControlled ? open : internalOpen;

  if (!content) {
    return <>{children}</>;
  }

  const trigger = isValidElement(children) ? children : <span>{children}</span>;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
  };

  const triggerElement = disabled ? (
    <span className={styles.tooltipTrigger}>{trigger}</span>
  ) : cloneElement(trigger, {
    onMouseEnter: (event: React.MouseEvent) => {
      trigger.props?.onMouseEnter?.(event);
      handleOpenChange(true);
    },
    onMouseLeave: (event: React.MouseEvent) => {
      trigger.props?.onMouseLeave?.(event);
      handleOpenChange(false);
    },
    onFocus: (event: React.FocusEvent) => {
      trigger.props?.onFocus?.(event);
      handleOpenChange(true);
    },
    onBlur: (event: React.FocusEvent) => {
      trigger.props?.onBlur?.(event);
      handleOpenChange(false);
    },
  });

  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root open={effectiveOpen} onOpenChange={handleOpenChange}>
        <TooltipPrimitive.Trigger asChild>{triggerElement}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className={styles.tooltipContent}
            onMouseEnter={() => handleOpenChange(true)}
            onMouseLeave={() => handleOpenChange(false)}
          >
            {content}
            <TooltipPrimitive.Arrow className={styles.tooltipArrow} width={10} height={5} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
