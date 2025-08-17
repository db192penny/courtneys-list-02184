import RateVendorModal from "./RateVendorModal";
import PreviewRateVendorModal from "./PreviewRateVendorModal";
import MobileRateVendorModal from "./MobileRateVendorModal";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendor: { id: string; name: string; category: string } | null;
  onSuccess?: () => void;
  isPreviewMode?: boolean;
  communityName?: string;
};

export default function RateVendorModalWrapper({ 
  open, 
  onOpenChange, 
  vendor, 
  onSuccess, 
  isPreviewMode,
  communityName 
}: Props) {
  const isMobile = useIsMobile();
  
  if (isPreviewMode) {
    return (
      <PreviewRateVendorModal
        open={open}
        onOpenChange={onOpenChange}
        vendor={vendor}
        onSuccess={onSuccess}
        communityName={communityName}
      />
    );
  }

  if (isMobile) {
    return (
      <MobileRateVendorModal
        open={open}
        onOpenChange={onOpenChange}
        vendor={vendor}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <RateVendorModal
      open={open}
      onOpenChange={onOpenChange}
      vendor={vendor}
      onSuccess={onSuccess}
    />
  );
}