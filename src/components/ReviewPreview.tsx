import { extractStreetName } from "@/utils/address";

type ReviewPreviewProps = {
  rating: number;
  showName: boolean;
  userName?: string;
  streetName?: string;
};

export default function ReviewPreview({ rating, showName, userName, streetName }: ReviewPreviewProps) {
  // Generate star symbols
  const stars = "⭐".repeat(Math.max(0, Math.min(5, rating)));
  
  // Format user name
  const formatName = (name?: string) => {
    if (!name || !name.trim()) return "Neighbor";
    const parts = name.trim().split(" ");
    if (parts.length === 0) return "Neighbor";
    const firstName = parts[0];
    const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
  };

  const displayName = showName ? formatName(userName) : "Neighbor";
  const streetDisplay = streetName && streetName.trim() ? ` on ${streetName}` : "";

  if (rating === 0) {
    return (
      <div className="text-sm text-muted-foreground italic">
        Select a rating to see preview
      </div>
    );
  }

  return (
    <div className="text-sm bg-muted/30 p-3 rounded-md border">
      <div className="font-medium text-muted-foreground mb-1">Review Preview:</div>
      <div className="text-foreground">
        {stars} ({rating}/5) by {displayName}{streetDisplay}
      </div>
    </div>
  );
}