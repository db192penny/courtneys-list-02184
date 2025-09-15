import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Calendar, Send, Users, UserPlus, X } from "lucide-react";

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

interface Props {
  communityName: string;
}

export default function WeeklyEmailSender({ communityName }: Props) {
  const [open, setOpen] = useState(false);
  const [recipientMode, setRecipientMode] = useState<"all" | "selected" | "custom">("all");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [customRecipients, setCustomRecipients] = useState<CustomRecipient[]>([]);
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [testMode, setTestMode] = useState(true);
  
  // Weekly email specific fields
  const [fiveStarHtml, setFiveStarHtml] = useState("");
  const [alertsHtml, setAlertsHtml] = useState("");
  const [activityHtml, setActivityHtml] = useState("");

  const { data: users = [] } = useQuery({
    queryKey: ["community-users", communityName],
    queryFn: async () => {
      console.log("Fetching users for weekly email...");
      
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

  const handleSendWeeklyEmail = async () => {
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

      const { data, error } = await supabase.functions.invoke("send-weekly-update", {
        body: {
          testMode,
          fiveStarHtml: fiveStarHtml.trim() || undefined,
          alertsHtml: alertsHtml.trim() || undefined,
          activityHtml: activityHtml.trim() || undefined,
          recipients: testMode ? undefined : recipients
        }
      });

      if (error) throw error;

      const recipientCount = testMode ? 1 : recipients.length;
      toast({
        title: "Weekly Email Sent Successfully",
        description: `Weekly update sent to ${recipientCount} recipient(s).`,
      });

      setOpen(false);
    } catch (error) {
      console.error("Failed to send weekly email:", error);
      toast({
        title: "Error",
        description: "Failed to send weekly email. Please try again.",
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="w-4 h-4" />
          Send Weekly Update
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Send Weekly Update Email
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Test Mode Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="testMode" 
              checked={testMode} 
              onCheckedChange={(checked) => setTestMode(checked === true)}
            />
            <Label htmlFor="testMode" className="text-sm">
              Test mode (send to 1 recipient only)
            </Label>
          </div>

          {/* Recipients Section - Only show if not in test mode */}
          {!testMode && (
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
          )}

          {/* Weekly Content Sections */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fiveStarHtml">5-Star Reviews HTML (optional)</Label>
              <Textarea
                id="fiveStarHtml"
                value={fiveStarHtml}
                onChange={(e) => setFiveStarHtml(e.target.value)}
                placeholder="HTML content for this week's 5-star reviews section"
                className="min-h-[100px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alertsHtml">Service Alerts HTML (optional)</Label>
              <Textarea
                id="alertsHtml"
                value={alertsHtml}
                onChange={(e) => setAlertsHtml(e.target.value)}
                placeholder="HTML content for service alerts section"
                className="min-h-[100px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="activityHtml">Community Activity HTML (optional)</Label>
              <Textarea
                id="activityHtml"
                value={activityHtml}
                onChange={(e) => setActivityHtml(e.target.value)}
                placeholder="HTML content for community activity section"
                className="min-h-[100px] resize-none"
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
              onClick={handleSendWeeklyEmail}
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
                  {testMode ? "Send Test" : "Send Weekly Update"}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}