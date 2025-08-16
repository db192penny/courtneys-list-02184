import { useState, useEffect } from "react";
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import SEO from "@/components/SEO";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, User, MapPin } from "lucide-react";

interface AddressChangeRequest {
  id: string;
  user_id: string;
  current_address: string;
  requested_address: string;
  requested_formatted_address?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  user_email?: string;
  user_name?: string;
}

export default function AdminAddressRequests() {
  const [requests, setRequests] = useState<AddressChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AddressChangeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("address_change_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get user emails for each request
      const userIds = data?.map(req => req.user_id) || [];
      const { data: users } = await supabase
        .from("users")
        .select("id, email, name")
        .in("id", userIds);

      const formatted = data?.map(req => {
        const user = users?.find(u => u.id === req.user_id);
        return {
          ...req,
          status: req.status as 'pending' | 'approved' | 'rejected' | 'cancelled',
          user_email: user?.email,
          user_name: user?.name
        };
      }) || [];

      setRequests(formatted);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast({
        title: "Error",
        description: "Failed to load address change requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('approve_address_change_request', {
        _request_id: requestId,
        _admin_notes: adminNotes || null
      });

      if (error) throw error;

      if (data?.[0]?.success) {
        toast({
          title: "Success",
          description: "Address change request approved",
        });
        fetchRequests();
        setSelectedRequest(null);
        setAdminNotes("");
      } else {
        throw new Error(data?.[0]?.message || "Failed to approve request");
      }
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        title: "Error",
        description: "Failed to approve address change request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc('reject_address_change_request', {
        _request_id: requestId,
        _rejection_reason: rejectionReason,
        _admin_notes: adminNotes || null
      });

      if (error) throw error;

      if (data?.[0]?.success) {
        toast({
          title: "Success",
          description: "Address change request rejected",
        });
        fetchRequests();
        setSelectedRequest(null);
        setRejectionReason("");
        setAdminNotes("");
      } else {
        throw new Error(data?.[0]?.message || "Failed to reject request");
      }
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast({
        title: "Error",
        description: "Failed to reject address change request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const processedRequests = requests.filter(req => req.status !== 'pending');

  return (
    <AdminProtectedRoute>
      <SEO
        title="Address Change Requests - Admin"
        description="Manage address change requests from users"
      />
      
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Address Change Requests</h1>
          <Button onClick={fetchRequests} variant="outline">
            Refresh
          </Button>
        </div>

        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Pending Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No pending address change requests
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Current Address</TableHead>
                    <TableHead>Requested Address</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <div>
                            <div className="font-medium">{request.user_name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">{request.user_email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{request.current_address}</TableCell>
                      <TableCell className="max-w-xs truncate">{request.requested_formatted_address || request.requested_address}</TableCell>
                      <TableCell className="max-w-xs truncate">{request.reason || '-'}</TableCell>
                      <TableCell>{format(new Date(request.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRequest(request)}
                            >
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Review Address Change Request</DialogTitle>
                            </DialogHeader>
                            
                            {selectedRequest && (
                              <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>User</Label>
                                    <div className="mt-1">
                                      <div className="font-medium">{selectedRequest.user_name}</div>
                                      <div className="text-sm text-muted-foreground">{selectedRequest.user_email}</div>
                                    </div>
                                  </div>
                                  <div>
                                    <Label>Request Date</Label>
                                    <div className="mt-1">{format(new Date(selectedRequest.created_at), 'PPp')}</div>
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <div>
                                    <Label className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4" />
                                      Current Address
                                    </Label>
                                    <div className="mt-1 p-3 bg-muted rounded-md">
                                      {selectedRequest.current_address}
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Label className="flex items-center gap-2">
                                      <MapPin className="w-4 h-4" />
                                      Requested Address
                                    </Label>
                                    <div className="mt-1 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                      {selectedRequest.requested_formatted_address || selectedRequest.requested_address}
                                    </div>
                                  </div>

                                  {selectedRequest.reason && (
                                    <div>
                                      <Label>User's Reason</Label>
                                      <div className="mt-1 p-3 bg-muted rounded-md">
                                        {selectedRequest.reason}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
                                    <Textarea
                                      id="adminNotes"
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                      placeholder="Add any notes about this approval/rejection..."
                                      className="mt-1"
                                    />
                                  </div>

                                  <div>
                                    <Label htmlFor="rejectionReason">Rejection Reason (Required for rejection)</Label>
                                    <Input
                                      id="rejectionReason"
                                      value={rejectionReason}
                                      onChange={(e) => setRejectionReason(e.target.value)}
                                      placeholder="Reason for rejecting this request..."
                                      className="mt-1"
                                    />
                                  </div>
                                </div>

                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleReject(selectedRequest.id)}
                                    disabled={actionLoading}
                                  >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                  </Button>
                                  <Button
                                    onClick={() => handleApprove(selectedRequest.id)}
                                    disabled={actionLoading}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Processed Requests */}
        <Card>
          <CardHeader>
            <CardTitle>Processed Requests ({processedRequests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {processedRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No processed requests yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Addresses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.user_name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{request.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm text-muted-foreground">From: {request.current_address}</div>
                          <div className="text-sm">To: {request.requested_formatted_address || request.requested_address}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>{format(new Date(request.created_at), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminProtectedRoute>
  );
}