import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, RotateCcw, Calendar, User } from "lucide-react";
import { format } from "date-fns";

interface CostEntry {
  id: string;
  vendor_id: string;
  vendor_name: string;
  vendor_category: string;
  amount: number;
  unit: string;
  period: string;
  cost_kind: string;
  notes?: string;
  created_at: string;
  created_by: string;
  author_name?: string;
  author_street?: string;
  admin_modified: boolean;
  admin_modified_by?: string;
  admin_modified_at?: string;
  deleted_at?: string;
}

interface AdminCostTableProps {
  costs: CostEntry[];
  onEdit: (cost: CostEntry) => void;
  onDelete: (costId: string) => void;
  onRestore: (costId: string) => void;
  showDeleted: boolean;
}

export function AdminCostTable({ costs, onEdit, onDelete, onRestore, showDeleted }: AdminCostTableProps) {
  const formatAmount = (amount: number, unit: string, period?: string) => {
    const formattedAmount = `$${amount.toLocaleString()}`;
    let unitDisplay = unit;
    
    if (period && period !== 'one_time') {
      unitDisplay = `${unit} (${period})`;
    }
    
    return `${formattedAmount}/${unitDisplay}`;
  };

  const getAuthorLabel = (cost: CostEntry) => {
    if (!cost.author_name) return "Unknown";
    
    const firstName = cost.author_name.split(" ")[0];
    const lastName = cost.author_name.split(" ").slice(-1)[0];
    const lastInitial = lastName ? lastName.charAt(0) + "." : "";
    
    let label = firstName;
    if (lastInitial && lastInitial !== firstName.charAt(0) + ".") {
      label += ` ${lastInitial}`;
    }
    
    if (cost.author_street) {
      label += ` on ${cost.author_street}`;
    }
    
    return label;
  };

  if (costs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {showDeleted ? "No deleted cost entries found" : "No active cost entries found"}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Vendor</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Cost Type</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {costs.map((cost) => (
            <TableRow key={cost.id}>
              <TableCell className="font-medium">{cost.vendor_name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{cost.vendor_category}</Badge>
              </TableCell>
              <TableCell>{formatAmount(cost.amount, cost.unit, cost.period)}</TableCell>
              <TableCell>
                <Badge variant="outline">{cost.cost_kind?.replace('_', ' ')}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm">
                  <User className="h-3 w-3" />
                  {getAuthorLabel(cost)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(cost.created_at), "MMM d, yyyy")}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {cost.admin_modified && (
                    <Badge variant="outline" className="text-xs">
                      Admin Modified
                    </Badge>
                  )}
                  {cost.deleted_at && (
                    <Badge variant="destructive" className="text-xs">
                      Deleted
                    </Badge>
                  )}
                  {!cost.admin_modified && !cost.deleted_at && (
                    <Badge variant="default" className="text-xs">
                      Original
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {!showDeleted ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(cost)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(cost.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRestore(cost.id)}
                      className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}