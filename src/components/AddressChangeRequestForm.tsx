import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useUserAddressChangeRequests } from "@/hooks/useAddressChangeRequests";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import SimpleAddressInput, { AddressSelectedPayload } from "./SimpleAddressInput";

interface AddressChangeRequestFormProps {
  currentAddress: string;
  onRequestSubmitted?: () => void;
}

export default function AddressChangeRequestForm({ 
  currentAddress, 
  onRequestSubmitted 
}: AddressChangeRequestFormProps) {
  const [selectedAddress, setSelectedAddress] = useState<AddressSelectedPayload | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { userRequests, loading, createRequest, cancelRequest, refetch } = useUserAddressChangeRequests();
  const { toast } = useToast();

  const pendingRequest = userRequests.find(req => req.status === 'pending');

  const handleAddressSelected = (payload: AddressSelectedPayload) => {
    setSelectedAddress(payload);
  };

  const handleSubmitRequest = async () => {
    if (!selectedAddress) return;

    try {
      setSubmitting(true);

      await createRequest({
        current_address: currentAddress,
        current_normalized_address: currentAddress.toLowerCase().trim(),
        requested_address: selectedAddress.formatted_address,
        requested_normalized_address: selectedAddress.household_address,
        requested_formatted_address: selectedAddress.formatted_address,
        requested_place_id: selectedAddress.place_id,
        reason: reason.trim() || undefined
      });

      toast({
        title: "Request Submitted",
        description: "Your address change request has been submitted for admin approval.",
      });

      // Reset form
      setSelectedAddress(null);
      setReason("");
      onRequestSubmitted?.();
    } catch (error) {
      console.error('Error submitting address change request:', error);
      toast({
        title: "Error",
        description: "Failed to submit address change request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelRequest(requestId);
      toast({
        title: "Request Cancelled",
        description: "Your address change request has been cancelled.",
      });
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast({
        title: "Error",
        description: "Failed to cancel request. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending Approval</Badge>;
      case 'approved':
        return <Badge variant="secondary" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="secondary" className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'cancelled':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Address Change Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing Requests */}
      {userRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Address Change Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      Request to change address
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">From:</span> {request.current_address}</p>
                    <p><span className="font-medium">To:</span> {request.requested_formatted_address || request.requested_address}</p>
                    {request.reason && (
                      <p><span className="font-medium">Reason:</span> {request.reason}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Submitted {new Date(request.created_at).toLocaleDateString()}</span>
                    {request.status === 'pending' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleCancelRequest(request.id)}
                      >
                        Cancel Request
                      </Button>
                    )}
                  </div>
                  
                  {request.status === 'rejected' && request.rejection_reason && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      <div className="font-medium">Rejection Reason:</div>
                      <div>{request.rejection_reason}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Request Form */}
      {!pendingRequest && (
        <Card>
          <CardHeader>
            <CardTitle>Request Address Change</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <div className="font-medium">Address changes require admin approval</div>
                  <div>Your current address will remain unchanged until an admin approves your request.</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Address</Label>
              <div className="p-2 bg-muted rounded text-sm">{currentAddress}</div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">New Address</Label>
              <SimpleAddressInput
                placeholder="Enter your new address..."
                onSelected={handleAddressSelected}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-sm font-medium">
                Reason for Change (Optional)
              </Label>
              <Textarea
                id="reason"
                placeholder="Explain why you're changing your address..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            <Button 
              onClick={handleSubmitRequest}
              disabled={!selectedAddress || submitting}
              className="w-full"
            >
              {submitting ? "Submitting Request..." : "Submit Address Change Request"}
            </Button>
          </CardContent>
        </Card>
      )}

      {pendingRequest && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Clock className="w-8 h-8 text-yellow-500 mx-auto" />
              <div className="font-medium">Address Change Request Pending</div>
              <div className="text-sm text-muted-foreground">
                You have a pending address change request. Please wait for admin approval before submitting another request.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
