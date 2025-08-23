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
  const [subject, setSubject] = useState("🎉 Courtney's List update: 20+ homes, leaderboard & your invite link!");
  const [body, setBody] = useState(`Hey neighbors,

Big thanks to everyone who already signed up for Courtney's List! We've got 20+ homes on board already — and honestly, it's already making my life easier. Just from reading your reviews, I now know who we're using for AC and a new pool vendor 😅.

To make it fun, we've added a points & leaderboard system (aka neighborhood "street cred"). Here's how you earn points:
   •   ⭐ Rate a vendor = +5 pts
   •   ➕ Add a new vendor = +5 pts
   •   📩 Invite a neighbor = +10 pts (use your unique invite link from your Profile page so you get credit!)

And here's the leaderboard so far:

🥇 [Neighbor Name] – 45 pts
🥈 [Neighbor Name] – 30 pts
🥉 [Neighbor Name] – 20 pts
… (and more climbing up fast!)

👉 Can you crack the Top 5? Just rate a few of your vendors and you'll be right up there.

We also just added Mobile Tire Repair and Pet Groomers to the categories 🐾🚗 — so check them out and keep the feedback coming.

Next goal: 50 homes (10% of the community)!
➡️ You can help us get there by:
	1.	Inviting your neighbors with your link (grab it from your Profile page).
	2.	Checking out the latest vendors and adding your reviews.

Every review and rating makes it easier for all of us to find a trusted plumber, AC guy, pool service, or pest control — without scrolling through endless FB posts.

Thanks again for making this a community effort 💜 — let's hit that 10% 

- Courtney`);
  const [recipientMode, setRecipientMode] = useState<"all" | "selected">("all");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ["community-users", communityName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, address")
        .eq("is_verified", true);

      if (error) {
        console.error("Failed to fetch users:", error);
        return [];
      }

      // Filter by community based on address (simplified matching)
      const communityUsers = data.filter(user => 
        user.address && user.name && user.email
      ).map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        address: user.address,
        display: `${user.name.split(' ')[0]} ${user.name.split(' ').slice(-1)[0]?.charAt(0)}. - ${user.address.split(',')[0]}`
      }));

      return communityUsers;
    },
    enabled: open,
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