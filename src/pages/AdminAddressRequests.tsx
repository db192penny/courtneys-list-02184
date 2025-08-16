import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Clock, User, MapPin } from "lucide-react";
import SEO from "@/components/SEO";

interface AddressChangeRequest {
  id: string;
  user_id: string;
  current_address: string;
  requested_address: string;
  requested_formatted_address?: string;
  reason?: string;
  status: string;
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  admin_notes?: string;
  user_email?: string;
  user_name?: string;
}

export default function AdminAddressRequests() {
  const [requests, setRequests] = useState<AddressChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AddressChangeRequest | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      
      // First get the requests
      const { data: requestsData, error } = await supabase
        .from('address_change_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Then get user data for each request
      const userIds = requestsData?.map(req => req.user_id) || [];
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, name')
        .in('id', userIds);

      const formattedRequests = requestsData?.map(req => {
        const user = usersData?.find(u => u.id === req.user_id);
        return {
          ...req,
          user_email: user?.email,
          user_name: user?.name
        };
      }) || [];

      setRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      toast({
        title: "Error",
        description: "Failed to load address change requests",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    
    try {
      setProcessing(true);
      
      const { data, error } = await supabase.rpc('approve_address_change_request', {
        _request_id: selectedRequest.id,
        _admin_notes: adminNotes || null
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to approve request');
      }

      toast({
        title: "Success",
        description: "Address change request approved successfully",
      });

      setShowApprovalDialog(false);
      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to approve request",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) return;
    
    try {
      setProcessing(true);
      
      const { data, error } = await supabase.rpc('reject_address_change_request', {
        _request_id: selectedRequest.id,
        _rejection_reason: rejectionReason,
        _admin_notes: adminNotes || null
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to reject request');
      }

      toast({
        title: "Success",
        description: "Address change request rejected",
      });

      setShowRejectionDialog(false);
      setSelectedRequest(null);
      setAdminNotes("");
      setRejectionReason("");
      fetchRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject request",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
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

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Admin - Address Change Requests"
        description="Manage address change requests"
      />
      
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Address Change Requests</h1>
            <p className="text-muted-foreground">Review and approve address change requests from users</p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              {pendingCount} pending
            </Badge>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              All Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No address change requests found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Current Address</TableHead>
                    <TableHead>Requested Address</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <div>
                            <div className="font-medium">{request.user_name}</div>
                            <div className="text-sm text-muted-foreground">{request.user_email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{request.current_address}</TableCell>
                      <TableCell className="max-w-xs truncate">{request.requested_formatted_address || request.requested_address}</TableCell>
                      <TableCell className="max-w-xs truncate">{request.reason || '-'}</TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowApprovalDialog(true);
                              }}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowRejectionDialog(true);
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {request.status === 'rejected' && request.rejection_reason && (
                          <div className="text-sm text-red-600 max-w-xs truncate">
                            {request.rejection_reason}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Approval Dialog */}
        <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Approve Address Change Request</DialogTitle>
              <DialogDescription>
                Review the address change details and approve if everything looks correct.
              </DialogDescription>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-medium">User</Label>
                    <p className="text-sm">{selectedRequest.user_name} ({selectedRequest.user_email})</p>
                  </div>
                  <div>
                    <Label className="font-medium">Request Date</Label>
                    <p className="text-sm">{new Date(selectedRequest.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="font-medium">Current Address</Label>
                  <p className="text-sm p-2 bg-muted rounded">{selectedRequest.current_address}</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="font-medium">Requested Address</Label>
                  <p className="text-sm p-2 bg-muted rounded">{selectedRequest.requested_formatted_address || selectedRequest.requested_address}</p>
                </div>
                
                {selectedRequest.reason && (
                  <div className="space-y-2">
                    <Label className="font-medium">User's Reason</Label>
                    <p className="text-sm p-2 bg-muted rounded">{selectedRequest.reason}</p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="admin-notes">Admin Notes (Optional)</Label>
                  <Textarea
                    id="admin-notes"
                    placeholder="Add any notes about this approval..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleApprove} disabled={processing}>
                {processing ? "Approving..." : "Approve Change"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Reject Address Change Request</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this address change request.
              </DialogDescription>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-medium">User</Label>
                  <p className="text-sm">{selectedRequest.user_name} ({selectedRequest.user_email})</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="font-medium">Requested Change</Label>
                  <div className="text-sm space-y-1">
                    <p><span className="font-medium">From:</span> {selectedRequest.current_address}</p>
                    <p><span className="font-medium">To:</span> {selectedRequest.requested_formatted_address || selectedRequest.requested_address}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Explain why this request is being rejected..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="admin-notes-reject">Admin Notes (Optional)</Label>
                  <Textarea
                    id="admin-notes-reject"
                    placeholder="Additional notes..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRejectionDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleReject} 
                disabled={processing || !rejectionReason.trim()}
              >
                {processing ? "Rejecting..." : "Reject Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}