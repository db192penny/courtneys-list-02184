import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Mail, Send, Users } from "lucide-react";

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

export default function EmailManagementPanel({ communityName }: Props) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("🎉 20+ Boca Bridges homes now on Courtney's List + leaderboard");
  const [body, setBody] = useState(`Hi Neighbors 💜,

Thanks so much for signing up — we now have 20+ Boca Bridges homes on Courtney's List! Already, just by reading the organized reviews, I know who I'm calling for my next AC repair, and we even found a new pool vendor.

To make this fun, we added a points system and a leaderboard (aka neighborhood street cred 😎):
   •   ⭐ Rate a Vendor = +5 pts
   •   ➕ Submit a New Vendor = +5 pts
   •   📩 Invite a Neighbor = +10 pts

Here's the current leaderboard 🏆:
{{LEADERBOARD}}

💡 New this week: categories now include Mobile Tire Repair and Pet Groomers. Keep the feedback coming and let us know about any bugs!

👉 Want to climb the leaderboard?
	1.	Rate 3–4 of your vendors to help your neighbors.
	2.	Invite a friend in Boca Bridges using your personal link below (points are tracked automatically when they join):

Your Invite Link:
{{INVITE_LINK}}

The more we all contribute, the more valuable (and stress-free!) this list becomes for the whole community.

💜 Courtney`);
  const [recipientMode, setRecipientMode] = useState<"all" | "selected">("all");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ["community-users"],
    queryFn: async () => {
      console.log("Fetching users for email dropdown...");
      
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, address")
        .eq("is_verified", true)
        .not("name", "is", null)
        .not("email", "is", null)
        .not("address", "is", null);

      if (error) {
        console.error("Failed to fetch users:", error);
        return [];
      }

      console.log("Raw user data:", data);

      const communityUsers = data.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        address: user.address,
        display: `${user.name.split(' ')[0]} ${user.name.split(' ').slice(-1)[0]?.charAt(0) || ''}. - ${user.address.split(',')[0]}`
      }));

      console.log("Processed users for dropdown:", communityUsers);
      return communityUsers;
    },
  });

  const handleSendEmail = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both subject and email body.",
        variant: "destructive",
      });
      return;
    }

    if (recipientMode === "selected" && selectedRecipients.length === 0) {
      toast({
        title: "No Recipients Selected",
        description: "Please select at least one recipient or choose 'Send to All'.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const recipients = recipientMode === "all" 
        ? users.map(u => u.email)
        : users.filter(u => selectedRecipients.includes(u.id)).map(u => u.email);

      const { data, error } = await supabase.functions.invoke("send-community-email", {
        body: {
          subject: subject.trim(),
          body: body.trim(),
          recipients,
          communityName,
          senderName: "Courtney"
        }
      });

      if (error) throw error;

      toast({
        title: "Email Sent Successfully",
        description: `Email sent to ${recipients.length} recipient(s).`,
      });

      setOpen(false);
    } catch (error) {
      console.error("Failed to send email:", error);
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
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
          <Mail className="w-4 h-4" />
          Send Email
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Send Community Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Recipients Section */}
          <div className="space-y-4">
            <Label>Recipients</Label>
            <Select value={recipientMode} onValueChange={(value: "all" | "selected") => setRecipientMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Send to All ({users.length} users)
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

          {/* Email Content */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Email Body</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email content"
                className="min-h-[300px] resize-none"
              />
            </div>
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
              onClick={handleSendEmail}
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
                  Send Email
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}