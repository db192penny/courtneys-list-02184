import { capitalizeStreetName, cleanStreetNameDisplay } from "@/utils/address";
import { formatNameWithLastInitial } from "@/utils/nameFormatting";

type ReviewPreviewProps = {
  rating: number;
  showName: boolean;
  userName?: string;
  streetName?: string;
};

export default function ReviewPreview({ rating, showName, userName, streetName }: ReviewPreviewProps) {
  // Generate star symbols
  const stars = "⭐".repeat(Math.max(0, Math.min(5, rating)));
  
  // Format user name using utility function
  const formatName = (name?: string) => {
    return formatNameWithLastInitial(name || "");
  };

  const displayName = showName ? formatName(userName) : "Neighbor";
  const cleanedStreetName = cleanStreetNameDisplay(streetName || '');
  const streetDisplay = cleanedStreetName && cleanedStreetName.trim() ? ` on ${capitalizeStreetName(cleanedStreetName)}` : "";

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