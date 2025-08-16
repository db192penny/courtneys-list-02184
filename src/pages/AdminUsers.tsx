import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, UserCheck, UserX, Trash2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface User {
  id: string;
  email: string;
  name: string | null;
  address: string | null;
  formatted_address: string | null;
  is_verified: boolean | null;
  signup_source: string | null;
  created_at: string;
  points: number | null;
  submissions_count: number | null;
  is_orphaned?: boolean;
  email_confirmed_at?: string | null;
}

interface UserActivity {
  type: string;
  count: number;
  latest: string | null;
}

const AdminUsers = () => {
  const canonical = typeof window !== "undefined" ? window.location.href : undefined;
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "pending">("all");
  const [sourceFilter, setSourceFilter] = useState<"all" | "community" | "regular">("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [loadingAction, setLoadingAction] = useState<Record<string, string>>({});

  // Fetch all users including orphaned ones
  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-all-users", statusFilter, sourceFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_all_users");
      if (error) throw error;
      
      let filteredData = data || [];
      
      if (statusFilter === "verified") {
        filteredData = filteredData.filter((user: any) => user.is_verified === true);
      } else if (statusFilter === "pending") {
        filteredData = filteredData.filter((user: any) => user.is_verified === false || user.is_orphaned === true);
      }

      return filteredData.map((user: any) => ({
        ...user,
        formatted_address: null,
        submissions_count: null
      })) as User[];
    },
  });

  // Filter users based on search term and source
  const filteredUsers = (users as User[]).filter(user => {
    const matchesSearch = !searchTerm || 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.address?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSource = sourceFilter === "all" || 
      (sourceFilter === "community" && user.signup_source?.startsWith("community:")) ||
      (sourceFilter === "regular" && !user.signup_source?.startsWith("community:"));

    return matchesSearch && matchesSource;
  });

  // Fetch user activity when user is selected
  useEffect(() => {
    if (!selectedUser) return;

    const fetchUserActivity = async () => {
      try {
        const [vendorsRes, reviewsRes, costsRes] = await Promise.all([
          supabase.from("vendors").select("id, created_at").eq("created_by", selectedUser.id),
          supabase.from("reviews").select("id, created_at").eq("user_id", selectedUser.id),
          supabase.from("costs").select("id, created_at").eq("created_by", selectedUser.id)
        ]);

        const activity: UserActivity[] = [
          {
            type: "Vendors Submitted",
            count: vendorsRes.data?.length || 0,
            latest: vendorsRes.data?.[0]?.created_at || null
          },
          {
            type: "Reviews Written",
            count: reviewsRes.data?.length || 0,
            latest: reviewsRes.data?.[0]?.created_at || null
          },
          {
            type: "Costs Shared",
            count: costsRes.data?.length || 0,
            latest: costsRes.data?.[0]?.created_at || null
          }
        ];

        setUserActivity(activity);
      } catch (error) {
        console.error("Failed to fetch user activity:", error);
      }
    };

    fetchUserActivity();
  }, [selectedUser]);

  const handleUserAction = async (userId: string, action: "verify" | "unverify" | "delete" | "cleanup") => {
    setLoadingAction(prev => ({ ...prev, [userId]: action }));

    try {
      if (action === "delete") {
        const confirmed = confirm("This will permanently delete the user and all their data. Continue?");
        if (!confirmed) return;

        const { error } = await supabase.rpc("admin_soft_delete_user", {
          _user_id: userId,
          _reason: "admin_panel_delete"
        });

        if (error) throw error;
        toast({ title: "User deleted", description: "User and their data have been completely removed." });
      } else if (action === "cleanup") {
        const confirmed = confirm("This will permanently remove this orphaned user from the system. Continue?");
        if (!confirmed) return;

        const { error } = await supabase.rpc("admin_cleanup_orphaned_user", {
          _user_id: userId
        });

        if (error) throw error;
        toast({ title: "Orphaned user cleaned up", description: "The orphaned user has been removed from the system." });
      } else {
        const isVerified = action === "verify";
        const { error } = await supabase
          .from("users")
          .update({ is_verified: isVerified })
          .eq("id", userId);

        if (error) throw error;
        toast({ 
          title: isVerified ? "User verified" : "User unverified", 
          description: isVerified ? "User now has access to the platform." : "User access has been revoked." 
        });
      }

      refetch();
    } catch (error: any) {
      toast({ 
        title: "Action failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoadingAction(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  };

  const getSignupSourceDisplay = (source: string | null) => {
    if (!source) return "Regular";
    if (source.startsWith("community:")) {
      const community = source.replace("community:", "");
      return `Community: ${community}`;
    }
    return source;
  };

  const getStatusBadge = (user: User) => {
    if (user.is_orphaned) {
      return <Badge variant="destructive">Orphaned</Badge>;
    }
    if (user.is_verified) {
      return <Badge className="bg-green-100 text-green-800">Verified</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="User Management — Admin"
        description="Manage all users, their verification status, and activity."
        canonical={canonical}
      />

      <section className="container py-10 max-w-7xl">
        <header className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage all users, their verification status, and view their activity.
          </p>
        </header>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter and search users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email, name, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sourceFilter} onValueChange={(v: any) => setSourceFilter(v)}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="community">Community Signups</SelectItem>
                  <SelectItem value="regular">Regular Signups</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Users ({filteredUsers.length})</CardTitle>
            <CardDescription>
              All registered users and their current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Signup Source</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading users...
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        No users found matching the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.name || "—"}</TableCell>
                        <TableCell>{getStatusBadge(user)}</TableCell>
                        <TableCell>{getSignupSourceDisplay(user.signup_source)}</TableCell>
                        <TableCell>{user.points || 0}</TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedUser(user)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {user.is_orphaned ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUserAction(user.id, "cleanup")}
                                disabled={!!loadingAction[user.id]}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <>
                                {user.is_verified ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUserAction(user.id, "unverify")}
                                    disabled={!!loadingAction[user.id]}
                                  >
                                    <UserX className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUserAction(user.id, "verify")}
                                    disabled={!!loadingAction[user.id]}
                                  >
                                    <UserCheck className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUserAction(user.id, "delete")}
                                  disabled={!!loadingAction[user.id]}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* User Detail Modal */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Complete information and activity for this user
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <p className="text-sm text-muted-foreground">{selectedUser.name || "—"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedUser)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Points</label>
                    <p className="text-sm text-muted-foreground">{selectedUser.points || 0}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Address</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedUser.formatted_address || selectedUser.address || "—"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Signup Source</label>
                    <p className="text-sm text-muted-foreground">
                      {getSignupSourceDisplay(selectedUser.signup_source)}
                    </p>
                  </div>
                </div>

                {/* Activity Summary */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Activity Summary</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {userActivity.map((activity) => (
                      <Card key={activity.type}>
                        <CardContent className="p-4">
                          <div className="text-2xl font-bold">{activity.count}</div>
                          <div className="text-sm text-muted-foreground">{activity.type}</div>
                          {activity.latest && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Last: {new Date(activity.latest).toLocaleDateString()}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </section>
    </main>
  );
};

export default AdminUsers;