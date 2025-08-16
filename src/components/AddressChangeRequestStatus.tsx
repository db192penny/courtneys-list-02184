import { usePendingAddressChangeRequest, useAddressChangeRequests } from "@/hooks/useAddressChangeRequests";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, XCircle, MapPin } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function AddressChangeRequestStatus() {
  const { data: requests, refetch } = useAddressChangeRequests();
  const pendingRequest = usePendingAddressChangeRequest();
  const { toast } = useToast();

  const handleCancelRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("address_change_requests")
        .update({ status: 'cancelled' })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Request cancelled",
        description: "Your address change request has been cancelled",
      });
      refetch();
    } catch (error) {
      console.error("Error cancelling request:", error);
      toast({
        title: "Error",
        description: "Failed to cancel address change request",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending Admin Approval</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!requests || requests.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Address Change Requests
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingRequest && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Pending Address Change</h4>
              {getStatusBadge(pendingRequest.status)}
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Requested Address:</span> {pendingRequest.requested_formatted_address || pendingRequest.requested_address}
              </div>
              {pendingRequest.reason && (
                <div>
                  <span className="font-medium">Reason:</span> {pendingRequest.reason}
                </div>
              )}
              <div>
                <span className="font-medium">Submitted:</span> {format(new Date(pendingRequest.created_at), 'PPp')}
              </div>
            </div>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCancelRequest(pendingRequest.id)}
              >
                Cancel Request
              </Button>
            </div>
          </div>
        )}

        {requests.filter(req => req.status !== 'pending').length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Request History</h4>
            <div className="space-y-2">
              {requests
                .filter(req => req.status !== 'pending')
                .slice(0, 3)
                .map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div className="space-y-1">
                      <div className="text-sm">
                        <span className="font-medium">To:</span> {request.requested_formatted_address || request.requested_address}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(request.created_at), 'MMM d, yyyy')}
                        {request.rejection_reason && (
                          <span className="ml-2">• {request.rejection_reason}</span>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}