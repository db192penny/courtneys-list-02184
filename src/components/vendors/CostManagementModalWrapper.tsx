import CostManagementModal from "./CostManagementModal";
import PreviewCostManagementModal from "./PreviewCostManagementModal";

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

  return (
    <CostManagementModal
      open={open}
      onOpenChange={onOpenChange}
      vendor={vendor}
      onSuccess={onSuccess}
    />
  );
}