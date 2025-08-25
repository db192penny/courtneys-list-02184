import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Heart, Send, Users, X } from "lucide-react";

interface EmailRecipient {
  id: string;
  name: string;
  email: string;
  address: string;
  display: string;
}

interface Props {
  communityName: string;
}

export default function ApologyEmailPanel({ communityName }: Props) {
  const [open, setOpen] = useState(false);
  const [recipientMode, setRecipientMode] = useState<"recent" | "selected">("recent");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch recent users (last 30 days) - these likely had magic link issues
  const { data: users = [] } = useQuery({
    queryKey: ["recent-community-users"],
    queryFn: async () => {
      console.log("Fetching recent users for apology email...");
      
      // Get users from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, address, created_at")
        .eq("is_verified", true)
        .not("name", "is", null)
        .not("email", "is", null)
        .not("address", "is", null)
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch recent users:", error);
        return [];
      }

      console.log("Recent user data:", data);

      const recentUsers = data.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        address: user.address,
        display: `${user.name.split(' ')[0]} ${user.name.split(' ').slice(-1)[0]?.charAt(0) || ''}. - ${user.address.split(',')[0]} (${new Date(user.created_at).toLocaleDateString()})`
      }));

      console.log("Processed recent users:", recentUsers);
      return recentUsers;
    },
  });

  const handleSendApologyEmail = async () => {
    if (recipientMode === "selected" && selectedRecipients.length === 0) {
      toast({
        title: "No Recipients Selected",
        description: "Please select at least one recipient or choose 'Send to Recent Users'.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const recipients = recipientMode === "recent" 
        ? users.map(u => ({ email: u.email, name: u.name }))
        : users.filter(u => selectedRecipients.includes(u.id)).map(u => ({ email: u.email, name: u.name }));

      const { data, error } = await supabase.functions.invoke("send-apology-email", {
        body: {
          recipients,
          communityName,
          communitySlug: communityName.toLowerCase().replace(/\s+/g, '-')
        }
      });

      if (error) throw error;

      toast({
        title: "Apology Email Sent Successfully",
        description: `Fresh login links sent to ${recipients.length} user(s). They should now be able to access the community!`,
      });

      setOpen(false);
    } catch (error) {
      console.error("Failed to send apology email:", error);
      toast({
        title: "Error",
        description: "Failed to send apology email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Heart className="w-4 h-4" />
          Apology Email
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5" />
            Send Apology Email with Fresh Login Links
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Email Preview */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Email Preview:</h4>
            <div className="text-sm space-y-2">
              <p><strong>Subject:</strong> Apologies for the login issue - fresh link inside! 🔐</p>
              <div className="mt-3 p-3 bg-background rounded border text-muted-foreground">
                <p>Hi [Name] 💜,</p>
                <br />
                <p>Thank you for joining Courtney's List! Apologies for not allowing you in - you are VIP but we had a little bug.</p>
                <br />
                <p>Hopefully now it's fixed, so please click here for access:</p>
                <p className="text-primary">[Fresh Magic Link Button]</p>
                <br />
                <p>Once you're in, click here to see all the amazing service providers:</p>
                <p className="text-primary">[See Boca Bridges Providers Button]</p>
                <br />
                <p>Thanks for your patience! 💜</p>
                <p>Courtney</p>
              </div>
            </div>
          </div>

          {/* Recipients Section */}
          <div className="space-y-4">
            <Label>Recipients ({users.length} recent users)</Label>
            <Select value={recipientMode} onValueChange={(value: "recent" | "selected") => setRecipientMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Send to All Recent Users ({users.length} from last 30 days)
                  </div>
                </SelectItem>
                <SelectItem value="selected">Select Specific Recipients</SelectItem>
              </SelectContent>
            </Select>

            {recipientMode === "selected" && (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Select recipients: {selectedRecipients.length} selected
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                        selectedRecipients.includes(user.id)
                          ? "bg-primary/10 border border-primary/20"
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                      onClick={() => toggleRecipient(user.id)}
                    >
                      <span className="text-sm">{user.display}</span>
                      {selectedRecipients.includes(user.id) && (
                        <Badge variant="secondary">Selected</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendApologyEmail}
              disabled={loading}
              className="flex-1 gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-background border-t-transparent rounded-full" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Apology Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}