import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { isValidElement, type ReactNode } from 'react';
import styles from './AssetsTable.module.css';

interface TooltipProps {
  children: ReactNode;
  content?: ReactNode;
  disabled?: boolean;
  open?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function Tooltip({ children, content, disabled = false, open, side = 'top' }: TooltipProps) {
  if (!content) {
    return <>{children}</>;
  }

  const trigger = isValidElement(children) ? children : <span>{children}</span>;

  const triggerElement = disabled ? (
    <span className={styles.tooltipTrigger}>{trigger}</span>
  ) : trigger;

  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root open={open}>
        <TooltipPrimitive.Trigger asChild>{triggerElement}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content side={side} sideOffset={6} className={styles.tooltipContent}>
            {content}
            <TooltipPrimitive.Arrow className={styles.tooltipArrow} width={10} height={5} />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
