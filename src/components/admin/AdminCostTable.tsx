import { useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminEditCostModal } from "./AdminEditCostModal";
import { Edit, Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminCostTableProps {
  costs: any[];
  isLoading: boolean;
  onUpdate: () => void;
}

export function AdminCostTable({ costs, isLoading, onUpdate }: AdminCostTableProps) {
  const [editingCost, setEditingCost] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSoftDelete = async (costId: string) => {
    try {
      const { error } = await supabase
        .from("costs")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq("id", costId);

      if (error) throw error;

      toast({
        title: "Cost entry deleted",
        description: "The cost entry has been soft deleted and excluded from community calculations.",
      });
      
      // Invalidate vendor-costs cache to update hover tooltips
      queryClient.invalidateQueries({ queryKey: ["vendor-costs"] });
      queryClient.invalidateQueries({ queryKey: ["community-stats"] });
      
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete cost entry",
        variant: "destructive",
      });
    }
  };

  const handleRestore = async (costId: string) => {
    try {
      const { error } = await supabase
        .from("costs")
        .update({
          deleted_at: null,
          deleted_by: null
        })
        .eq("id", costId);

      if (error) throw error;

      toast({
        title: "Cost entry restored",
        description: "The cost entry has been restored and included in community calculations.",
      });
      
      // Invalidate vendor-costs cache to update hover tooltips
      queryClient.invalidateQueries({ queryKey: ["vendor-costs"] });
      queryClient.invalidateQueries({ queryKey: ["community-stats"] });
      
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore cost entry",
        variant: "destructive",
      });
    }
  };

  const formatAmount = (amount: number, unit?: string) => {
    return `$${amount}${unit ? `/${unit}` : ''}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-muted-foreground">Loading cost entries...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Cost Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Cost Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Anonymous</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map((cost) => (
                  <TableRow key={cost.id} className={cost.deleted_at ? "opacity-50" : ""}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{cost.vendors?.name || "Unknown Vendor"}</div>
                      <div className="text-sm text-muted-foreground">{cost.vendors?.category}</div>
                    </div>
                  </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatAmount(cost.amount, cost.unit)}</div>
                      {cost.period && cost.period !== "one_time" && (
                        <div className="text-sm text-muted-foreground">per {cost.period}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {cost.cost_kind?.replace("_", " ") || "N/A"}
                      </Badge>
                    </TableCell>
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium">
                        {cost.users?.name || cost.users?.email || "Unknown User"}
                      </div>
                      {cost.users?.email && cost.users?.name && (
                        <div className="text-xs text-muted-foreground">{cost.users.email}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cost.anonymous ? "destructive" : "default"}>
                      {cost.anonymous ? "Yes" : "No"}
                    </Badge>
                  </TableCell>
                    <TableCell>
                      <div className="text-sm">{format(new Date(cost.created_at), "MMM d, yyyy")}</div>
                      <div className="text-xs text-muted-foreground">{format(new Date(cost.created_at), "h:mm a")}</div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {cost.deleted_at && (
                          <Badge variant="destructive" className="text-xs">
                            Deleted
                          </Badge>
                        )}
                        {cost.admin_modified && (
                          <Badge variant="secondary" className="text-xs">
                            Admin Modified
                          </Badge>
                        )}
                        {!cost.deleted_at && !cost.admin_modified && (
                          <Badge variant="outline" className="text-xs">
                            Active
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingCost(cost)}
                          disabled={!!cost.deleted_at}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        
                        {cost.deleted_at ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(cost.id)}
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-destructive" />
                                  Delete Cost Entry
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will soft delete the cost entry, removing it from community calculations but preserving the data for audit purposes. This action can be reversed.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleSoftDelete(cost.id)}>
                                  Delete Entry
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {costs.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No cost entries found
            </div>
          )}
        </CardContent>
      </Card>

      {editingCost && (
        <AdminEditCostModal
          cost={editingCost}
          open={!!editingCost}
          onOpenChange={(open) => !open && setEditingCost(null)}
          onSuccess={() => {
            setEditingCost(null);
            onUpdate();
          }}
        />
      )}
    </>
  );
}