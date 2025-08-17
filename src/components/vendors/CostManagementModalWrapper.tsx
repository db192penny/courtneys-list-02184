import CostManagementModal from "./CostManagementModal";
import PreviewCostManagementModal from "./PreviewCostManagementModal";
import MobileCostManagementModal from "./MobileCostManagementModal";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vendor: { id: string; name: string; category: string } | null;
  onSuccess?: () => void;
  isPreviewMode?: boolean;
  communityName?: string;
};

export default function CostManagementModalWrapper({ 
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
      <PreviewCostManagementModal
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
      <MobileCostManagementModal
        open={open}
        onOpenChange={onOpenChange}
        vendor={vendor}
        onSuccess={onSuccess}
      />
    );
  }

  return (
    <CostManagementModal
      open={open}
      onOpenChange={onOpenChange}
      vendor={vendor}
      onSuccess={onSuccess}
    />
  );
}