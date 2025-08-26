import { Button } from '@/components/ui/button';
import { useAnalytics } from '@/hooks/useAnalytics';
import { ButtonProps } from '@/components/ui/button';
import { forwardRef } from 'react';

interface TrackingButtonProps extends ButtonProps {
  eventName: string;
  elementId?: string;
  vendorId?: string;
  category?: string;
  metadata?: Record<string, any>;
}

export const TrackingButton = forwardRef<HTMLButtonElement, TrackingButtonProps>(
  ({ eventName, elementId, vendorId, category, metadata, onClick, children, ...props }, ref) => {
    const { trackEvent } = useAnalytics();

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      // Track the click
      await trackEvent({
        eventType: 'button_click',
        eventName,
        elementId,
        elementText: typeof children === 'string' ? children : undefined,
        vendorId,
        category,
        metadata
      });

      // Call original onClick if provided
      if (onClick) {
        onClick(e);
      }
    };

    return (
      <Button ref={ref} onClick={handleClick} {...props}>
        {children}
      </Button>
    );
  }
);

TrackingButton.displayName = 'TrackingButton';