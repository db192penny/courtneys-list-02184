import RateVendorModal from "./RateVendorModal";
import PreviewRateVendorModal from "./PreviewRateVendorModal";

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

  return (
    <RateVendorModal
      open={open}
      onOpenChange={onOpenChange}
      vendor={vendor}
      onSuccess={onSuccess}
    />
  );
}