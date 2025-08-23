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
import { Mail, Send, Users, FileText } from "lucide-react";

interface EmailRecipient {
  id: string;
  name: string;
  email: string;
  address: string;
  display: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  body: string;
}

interface Props {
  communityName: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "welcome-1",
    name: "Welcome Email #1 - Community Leaderboard Update",
    description: "Welcome email with current leaderboard and invitation links",
    subject: "🎉 20+ {COMMUNITY_NAME} homes now on Courtney's List + leaderboard",
    body: `Hi Neighbors 💜,

Thanks so much for signing up — we now have 20+ {COMMUNITY_NAME} homes on Courtney's List! Already, just by reading the organized reviews, I know who I'm calling for my next AC repair, and we even found a new pool vendor.

To make this fun, we added a points system and a leaderboard (aka neighborhood street cred 😎):
   •   ⭐ Rate a Vendor = +5 pts
   •   ➕ Submit a New Vendor = +5 pts
   •   📩 Invite a Neighbor = +10 pts

Here's the current leaderboard 🏆:
{{LEADERBOARD}}

💡 New this week: categories now include Mobile Tire Repair and Pet Groomers. Keep the feedback coming and let us know about any bugs!

👉 Want to climb the leaderboard?
	1.	Rate 3–4 of your vendors to help your neighbors.
	2.	Invite a friend in {COMMUNITY_NAME} using your personal link below (points are tracked automatically when they join):

Your Invite Link:
{{INVITE_LINK}}

The more we all contribute, the more valuable (and stress-free!) this list becomes for the whole community.

💜 Courtney`
  },
  {
    id: "custom",
    name: "Custom Email",
    description: "Create your own custom email from scratch",
    subject: "",
    body: ""
  }
];

export default function EmailTemplatePanel({ communityName }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("welcome-1");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientMode, setRecipientMode] = useState<"all" | "selected">("all");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ["community-users", communityName],
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

      const communityUsers = data.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        address: user.address,
        display: `${user.name.split(' ')[0]} ${user.name.split(' ').slice(-1)[0]?.charAt(0) || ''}. - ${user.address.split(',')[0]}`
      }));

      return communityUsers;
    },
    enabled: !!communityName
  });

  // Update subject and body when template changes
  useEffect(() => {
    const template = EMAIL_TEMPLATES.find(t => t.id === selectedTemplateId);
    if (template) {
      const processedSubject = template.subject.replace(/\{COMMUNITY_NAME\}/g, communityName);
      const processedBody = template.body.replace(/\{COMMUNITY_NAME\}/g, communityName);
      
      setSubject(processedSubject);
      setBody(processedBody);
    }
  }, [selectedTemplateId, communityName]);

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

  const selectedTemplate = EMAIL_TEMPLATES.find(t => t.id === selectedTemplateId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Mail className="w-4 h-4" />
          Send Community Email
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Send Community Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-3">
            <Label>Email Template</Label>
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMAIL_TEMPLATES.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {template.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTemplate && (
              <p className="text-sm text-muted-foreground">
                {selectedTemplate.description}
              </p>
            )}
          </div>

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
              <div className="text-xs text-muted-foreground">
                Available placeholders: <code>{`{{LEADERBOARD}}`}</code> and <code>{`{{INVITE_LINK}}`}</code> will be automatically replaced for each recipient.
              </div>
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