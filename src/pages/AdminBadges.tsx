import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserBadge from "@/components/badges/UserBadge";
import { Pencil, Save, X, Plus } from "lucide-react";

type BadgeLevel = {
  id: string;
  name: string;
  min_points: number;
  color: string;
  icon: string;
};

type PointReward = {
  id: string;
  activity: string;
  points: number;
  description: string | null;
};

const AdminBadges = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  
  const [editingBadge, setEditingBadge] = useState<string | null>(null);
  const [editingReward, setEditingReward] = useState<string | null>(null);
  const [newBadge, setNewBadge] = useState<Partial<BadgeLevel>>({});
  const [newReward, setNewReward] = useState<Partial<PointReward>>({});

  // Fetch badge levels
  const { data: badgeLevels = [], isLoading: badgesLoading } = useQuery<BadgeLevel[]>({
    queryKey: ["admin-badge-levels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badge_levels")
        .select("*")
        .order("min_points", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  // Fetch point rewards
  const { data: pointRewards = [], isLoading: rewardsLoading } = useQuery<PointReward[]>({
    queryKey: ["admin-point-rewards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_rewards")
        .select("*")
        .order("activity");
      
      if (error) throw error;
      return data || [];
    },
    enabled: isAdmin,
  });

  if (isAdminLoading) {
    return <div className="flex justify-center py-10">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="container max-w-xl py-10">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Access denied. Admin privileges required.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleUpdateBadge = async (badge: BadgeLevel) => {
    const { error } = await supabase
      .from("badge_levels")
      .update({
        name: badge.name,
        min_points: badge.min_points,
        color: badge.color,
        icon: badge.icon,
      })
      .eq("id", badge.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setEditingBadge(null);
    queryClient.invalidateQueries({ queryKey: ["admin-badge-levels"] });
    queryClient.invalidateQueries({ queryKey: ["badge-levels"] });
    toast({ title: "Updated", description: "Badge level updated successfully" });
  };

  const handleUpdateReward = async (reward: PointReward) => {
    const { error } = await supabase
      .from("point_rewards")
      .update({
        points: reward.points,
        description: reward.description,
      })
      .eq("id", reward.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setEditingReward(null);
    queryClient.invalidateQueries({ queryKey: ["admin-point-rewards"] });
    toast({ title: "Updated", description: "Point reward updated successfully" });
  };

  const handleCreateBadge = async () => {
    if (!newBadge.name || !newBadge.min_points || !newBadge.color || !newBadge.icon) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("badge_levels")
      .insert([{
        name: newBadge.name,
        min_points: newBadge.min_points,
        color: newBadge.color,
        icon: newBadge.icon,
      }]);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setNewBadge({});
    queryClient.invalidateQueries({ queryKey: ["admin-badge-levels"] });
    queryClient.invalidateQueries({ queryKey: ["badge-levels"] });
    toast({ title: "Created", description: "Badge level created successfully" });
  };

  const canonical = typeof window !== "undefined" ? window.location.href : undefined;

  return (
    <main className="min-h-screen bg-background">
      <SEO
        title="Badge Management — Admin"
        description="Manage badge levels and point rewards"
        canonical={canonical}
      />
      
      <section className="container max-w-4xl py-10">
        <h1 className="text-3xl font-semibold mb-6">Badge & Points Management</h1>
        
        <Tabs defaultValue="badges" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="badges">Badge Levels</TabsTrigger>
            <TabsTrigger value="rewards">Point Rewards</TabsTrigger>
          </TabsList>
          
          <TabsContent value="badges" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Badge Levels</CardTitle>
              </CardHeader>
              <CardContent>
                {badgesLoading ? (
                  <p>Loading...</p>
                ) : (
                  <div className="space-y-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Preview</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Min Points</TableHead>
                          <TableHead>Color</TableHead>
                          <TableHead>Icon</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {badgeLevels.map((badge) => (
                          <BadgeRow
                            key={badge.id}
                            badge={badge}
                            isEditing={editingBadge === badge.id}
                            onEdit={() => setEditingBadge(badge.id)}
                            onCancel={() => setEditingBadge(null)}
                            onSave={handleUpdateBadge}
                          />
                        ))}
                      </TableBody>
                    </Table>
                    
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Add New Badge Level</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                          <div>
                            <Label>Name</Label>
                            <Input
                              value={newBadge.name || ""}
                              onChange={(e) => setNewBadge(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="Badge name"
                            />
                          </div>
                          <div>
                            <Label>Min Points</Label>
                            <Input
                              type="number"
                              value={newBadge.min_points || ""}
                              onChange={(e) => setNewBadge(prev => ({ ...prev, min_points: parseInt(e.target.value) }))}
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label>Color</Label>
                            <Input
                              value={newBadge.color || ""}
                              onChange={(e) => setNewBadge(prev => ({ ...prev, color: e.target.value }))}
                              placeholder="#3b82f6"
                            />
                          </div>
                          <div>
                            <Label>Icon</Label>
                            <Input
                              value={newBadge.icon || ""}
                              onChange={(e) => setNewBadge(prev => ({ ...prev, icon: e.target.value }))}
                              placeholder="star"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button onClick={handleCreateBadge} className="w-full">
                              <Plus className="w-4 h-4 mr-2" />
                              Add Badge
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="rewards" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Point Rewards</CardTitle>
              </CardHeader>
              <CardContent>
                {rewardsLoading ? (
                  <p>Loading...</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Activity</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pointRewards.map((reward) => (
                        <RewardRow
                          key={reward.id}
                          reward={reward}
                          isEditing={editingReward === reward.id}
                          onEdit={() => setEditingReward(reward.id)}
                          onCancel={() => setEditingReward(null)}
                          onSave={handleUpdateReward}
                        />
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
};

// Badge row component for editing
const BadgeRow = ({ 
  badge, 
  isEditing, 
  onEdit, 
  onCancel, 
  onSave 
}: {
  badge: BadgeLevel;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (badge: BadgeLevel) => void;
}) => {
  const [editedBadge, setEditedBadge] = useState(badge);

  if (isEditing) {
    return (
      <TableRow>
        <TableCell>
          <UserBadge
            name={editedBadge.name}
            color={editedBadge.color}
            icon={editedBadge.icon}
            size="sm"
          />
        </TableCell>
        <TableCell>
          <Input
            value={editedBadge.name}
            onChange={(e) => setEditedBadge(prev => ({ ...prev, name: e.target.value }))}
          />
        </TableCell>
        <TableCell>
          <Input
            type="number"
            value={editedBadge.min_points}
            onChange={(e) => setEditedBadge(prev => ({ ...prev, min_points: parseInt(e.target.value) }))}
          />
        </TableCell>
        <TableCell>
          <Input
            value={editedBadge.color}
            onChange={(e) => setEditedBadge(prev => ({ ...prev, color: e.target.value }))}
          />
        </TableCell>
        <TableCell>
          <Input
            value={editedBadge.icon}
            onChange={(e) => setEditedBadge(prev => ({ ...prev, icon: e.target.value }))}
          />
        </TableCell>
        <TableCell>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onSave(editedBadge)}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>
        <UserBadge
          name={badge.name}
          color={badge.color}
          icon={badge.icon}
          size="sm"
        />
      </TableCell>
      <TableCell>{badge.name}</TableCell>
      <TableCell>{badge.min_points}</TableCell>
      <TableCell>{badge.color}</TableCell>
      <TableCell>{badge.icon}</TableCell>
      <TableCell>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

// Reward row component for editing
const RewardRow = ({ 
  reward, 
  isEditing, 
  onEdit, 
  onCancel, 
  onSave 
}: {
  reward: PointReward;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (reward: PointReward) => void;
}) => {
  const [editedReward, setEditedReward] = useState(reward);

  if (isEditing) {
    return (
      <TableRow>
        <TableCell>{reward.activity}</TableCell>
        <TableCell>
          <Input
            type="number"
            value={editedReward.points}
            onChange={(e) => setEditedReward(prev => ({ ...prev, points: parseInt(e.target.value) }))}
          />
        </TableCell>
        <TableCell>
          <Input
            value={editedReward.description || ""}
            onChange={(e) => setEditedReward(prev => ({ ...prev, description: e.target.value }))}
          />
        </TableCell>
        <TableCell>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onSave(editedReward)}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell className="font-medium">{reward.activity}</TableCell>
      <TableCell>{reward.points}</TableCell>
      <TableCell>{reward.description}</TableCell>
      <TableCell>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="w-4 h-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default AdminBadges;