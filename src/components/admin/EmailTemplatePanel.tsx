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
import { Mail, Send, Users, FileText, UserPlus, X } from "lucide-react";

interface EmailRecipient {
  id: string;
  name: string;
  email: string;
  address: string;
  display: string;
}

interface CustomRecipient {
  name: string;
  email: string;
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
    id: "welcome",
    name: "Welcome Email",
    description: "Welcome new members to Courtney's List with 100+ homes milestone",
    subject: "Welcome to Courtney's List - Your Trusted Neighbor Network! 🏡",
    body: `Hi {{FIRST_NAME}},

Welcome to our exclusive network of 100+ {COMMUNITY_NAME} homes who trust each other's service provider recommendations!

Say goodbye to those "Can anyone recommend a good plumber?" posts on Facebook and WhatsApp! 🙋‍♀️ You've just joined the place where your neighbors' ratings, reviews, and more have been organized in one location and this will hopefully make your lives in {COMMUNITY_NAME} a little less stressful :) 

What you can do now:
- Browse trusted service provider reviews from neighbors
- Share your own experiences to help others  
- Find reliable professionals who already know our neighborhood
- Earn points for every contribution

Ready to dive in? Click here to explore service provider reviews from your neighbors:
👉 {{VIEW_PROVIDERS_LINK}}

💡 Pro Tip: Start by searching for services you currently use. Your reviews help neighbors make informed decisions!

So appreciate you!

Your neighbor,
Courtney 

---
Courtney's List - Trusted by 100+ {COMMUNITY_NAME} Homes`
  },
  {
    id: "celebration-100-homes",
    name: "100 Homes Celebration",
    description: "Celebration email for reaching 100 homes milestone with rewards and leaderboard",
    subject: "🎉 We hit 100+ homes! Your coffee awaits ☕",
    body: `Hey {{FIRST_NAME}}!

We did it! I wanted to share some exciting updates and say THANK YOU!

📊 BY THE NUMBERS:
• 102 Homes Joined
• 157 Reviews Shared  
• 48 Vendors Listed

🆕 JUST ADDED:
Water Filtration & Dryer Vent Cleaning - two of your most-requested categories are now live!

🌟 THIS WEEK'S TOP CONTRIBUTORS:

Lisa R. on Abrruzzo Ave - 7 reviews
Frances F. on Chauvet Wy - 7 reviews
Natalie L. on Espresso Mnr - 6 reviews
Brian B. on Abruzzo Ave - 5 reviews
Helena B. on Macchiato - 5 reviews
Tara L. on Santaluce Mnr - 3 reviews
Debra B. on Rosella Rd - 3 reviews

💝 YOUR REWARDS ARE HERE!
☕ Starbucks Gift Cards: If you submit 3+ reviews (Limited time - I'd love to buy everyone coffee forever, but... 😅)!
💰 $200 Service Credit Raffle: Every review = 1 entry. Drawing this Friday!

When I started this, I just wanted to stop answering the same vendor questions over and over. But you've turned it into something amazing - a true community resource where neighbors help neighbors. Every review you add makes this more valuable for all of us in {COMMUNITY_NAME}.

With gratitude (and caffeine),
Courtney
With help (David, Justin, Ryan, and Penny poodle)

{{VIEW_PROVIDERS_BUTTON}}`
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
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("welcome");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientMode, setRecipientMode] = useState<"all" | "selected" | "custom">("all");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [customRecipients, setCustomRecipients] = useState<CustomRecipient[]>([]);
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");
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
      })).sort((a, b) => a.name.localeCompare(b.name));

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

    if (recipientMode === "custom" && customRecipients.length === 0) {
      toast({
        title: "No Custom Recipients Added",
        description: "Please add at least one custom recipient.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const recipients = recipientMode === "all" 
        ? users.map(u => u.email)
        : recipientMode === "selected"
        ? users.filter(u => selectedRecipients.includes(u.id)).map(u => u.email)
        : customRecipients.map(r => r.email);

      const { data, error } = await supabase.functions.invoke("send-community-email", {
        body: {
          subject: subject.trim(),
          body: body.trim(),
          recipients,
          communityName,
          senderName: "Courtney",
          templateId: selectedTemplateId
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

  const addCustomRecipient = () => {
    if (!customName.trim() || !customEmail.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both name and email.",
        variant: "destructive",
      });
      return;
    }

    if (!/\S+@\S+\.\S+/.test(customEmail)) {
      toast({
        title: "Invalid Email",
        description: "Please provide a valid email address.",
        variant: "destructive",
      });
      return;
    }

    if (customRecipients.some(r => r.email.toLowerCase() === customEmail.toLowerCase())) {
      toast({
        title: "Duplicate Email",
        description: "This email is already in the list.",
        variant: "destructive",
      });
      return;
    }

    setCustomRecipients(prev => [...prev, { name: customName.trim(), email: customEmail.trim() }]);
    setCustomName("");
    setCustomEmail("");
  };

  const removeCustomRecipient = (index: number) => {
    setCustomRecipients(prev => prev.filter((_, i) => i !== index));
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
            <Select value={recipientMode} onValueChange={(value: "all" | "selected" | "custom") => setRecipientMode(value)}>
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
                <SelectItem value="custom">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Add Custom Recipients
                  </div>
                </SelectItem>
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

            {recipientMode === "custom" && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Add custom recipients: {customRecipients.length} added
                </div>
                
                {/* Add Custom Recipient Form */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Name"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="email"
                      placeholder="Email"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={addCustomRecipient}
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Custom Recipients List */}
                {customRecipients.length > 0 && (
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-2">
                    {customRecipients.map((recipient, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <span className="text-sm">
                          {recipient.name} ({recipient.email})
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomRecipient(index)}
                          className="h-6 w-6"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
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
                Available placeholders: <code>{`{{LEADERBOARD}}`}</code>, <code>{`{{INVITE_LINK}}`}</code>, <code>{`{{FIRST_NAME}}`}</code>, <code>{`{{VIEW_PROVIDERS_BUTTON}}`}</code> and <code>{`{{VIEW_PROVIDERS_LINK}}`}</code> will be automatically replaced for each recipient.
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