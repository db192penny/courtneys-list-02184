import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, Send, AlertCircle, RefreshCw, Users, Clock } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export function WelcomeEmailTemplate() {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [newUsersWithoutWelcome, setNewUsersWithoutWelcome] = useState<any[]>([]);
  const [selectedNewUsers, setSelectedNewUsers] = useState<string[]>([]);
  const [welcomeSentList, setWelcomeSentList] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const emailTemplate = {
    subject: "Welcome to Courtney's List - Your Trusted Neighbor Network! 🏡",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px;">Welcome to Courtney's List!</h1>
          </div>
          
          <div style="padding: 40px 30px;">
            <p style="font-size: 18px; color: #333333; margin-bottom: 20px;">Hi {{NAME}},</p>
            
            <p style="font-size: 16px; color: #555555; line-height: 1.6;">
              Welcome to our exclusive network of <strong>100+ Boca Bridges homes</strong> who trust each other's service provider recommendations!
            </p>
            
            <p style="font-size: 16px; color: #555555; line-height: 1.6; font-style: italic;">
              Say goodbye to those "Can anyone recommend a good plumber?" posts on Facebook and WhatsApp! 🙋‍♀️ You've just joined the place where your neighbors have already done the homework for you.
            </p>
            
            <div style="background-color: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 30px 0;">
              <p style="font-size: 16px; color: #333333; margin: 0 0 15px 0;"><strong>What you can do now:</strong></p>
              <ul style="color: #555555; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>Browse trusted service provider reviews from neighbors</li>
                <li>Share your own experiences to help others</li>
                <li>Find reliable professionals who already know our neighborhood</li>
                <li>Earn points for every contribution</li>
              </ul>
            </div>
            
            <p style="font-size: 16px; color: #555555; line-height: 1.6; margin: 30px 0; text-align: center;">
              <strong>Ready to dive in?</strong> 
              <a href="{{LINK}}" style="color: #667eea; text-decoration: underline; font-weight: bold; font-size: 16px;">
                Click here to explore service provider reviews from your neighbors →
              </a>
            </p>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 30px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>💡 Pro Tip:</strong> Start by searching for services you currently use. 
                Your reviews help neighbors make informed decisions!
              </p>
            </div>
            
            <p style="font-size: 14px; color: #777777; margin-top: 30px;">
              Questions? Just reply to this email and I'll personally help you get started.
            </p>
            
            <p style="font-size: 14px; color: #555555;">
              Your neighbor,<br>
              <strong>Courtney</strong>
            </p>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="font-size: 12px; color: #999999; margin: 0;">
              Courtney's List - Trusted by 100+ Boca Bridges Homes<br>
              <a href="{{LINK}}" style="color: #667eea;">Visit Website</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  useEffect(() => {
    // Load sent list from localStorage
    const stored = localStorage.getItem('welcomeEmailsSent');
    if (stored) {
      setWelcomeSentList(JSON.parse(stored));
    }
    loadUsers();
  }, []);

  useEffect(() => {
    // When new users list changes, select all by default
    if (newUsersWithoutWelcome.length > 0) {
      setSelectedNewUsers(newUsersWithoutWelcome.map(u => u.id));
    }
  }, [newUsersWithoutWelcome]);

  const loadUsers = async () => {
    setLoading(true);
    
    try {
      // Query users table with household_hoa join for Boca Bridges
      const { data: usersData, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          name,
          created_at,
          is_verified,
          address,
          household_hoa!inner(
            hoa_name
          )
        `)
        .eq('household_hoa.hoa_name', 'Boca Bridges')
        .eq('is_verified', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database query error:', error);
        throw error;
      }

      if (usersData) {
        setUsers(usersData);
        
        // Find new users (last 3 days) without welcome emails
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        const stored = localStorage.getItem('welcomeEmailsSent');
        const sentList = stored ? JSON.parse(stored) : {};
        
        const newUsersNoWelcome = usersData.filter(user => {
          const userCreatedAt = new Date(user.created_at);
          return userCreatedAt > threeDaysAgo && !sentList[user.id];
        });
        
        setNewUsersWithoutWelcome(newUsersNoWelcome);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error loading users",
        description: "Please check the console for details",
        variant: "destructive"
      });
    }
    
    setLoading(false);
  };

  const markAsSent = (userId: string) => {
    const newSentList = {
      ...welcomeSentList,
      [userId]: new Date().toISOString()
    };
    setWelcomeSentList(newSentList);
    localStorage.setItem('welcomeEmailsSent', JSON.stringify(newSentList));
  };

  const sendWelcomeEmailToUser = async (user: any) => {
    const websiteLink = `${window.location.origin}/communities/boca-bridges`;
    
    const finalHtml = emailTemplate.html
      .replace(/{{NAME}}/g, user.name || 'Neighbor')
      .replace(/{{LINK}}/g, websiteLink);
    
    const { error } = await supabase.functions.invoke('send-community-email', {
      body: {
        to: user.email,
        subject: emailTemplate.subject,
        html: finalHtml
      }
    });

    if (!error) {
      markAsSent(user.id);
      return true;
    }
    
    return false;
  };

  const sendSingleWelcomeEmail = async () => {
    if (!selectedUserId) {
      toast({
        title: "No user selected",
        description: "Please select a user to send the welcome email to.",
        variant: "destructive"
      });
      return;
    }

    const user = users.find(u => u.id === selectedUserId);
    if (!user) return;

    setSending(true);
    
    try {
      const success = await sendWelcomeEmailToUser(user);
      
      if (success) {
        toast({
          title: "Success!",
          description: `Welcome email sent to ${user.name || user.email}`,
        });
        
        setSelectedUserId('');
        loadUsers(); // Refresh lists
      } else {
        throw new Error("Failed to send email");
      }
    } catch (error: any) {
      console.error('Failed to send welcome email:', error);
      toast({
        title: "Failed to send email",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const sendBatchWelcomeEmails = async () => {
    if (selectedNewUsers.length === 0) {
      toast({
        title: "No users selected",
        description: "Please select at least one user to send welcome emails to.",
        variant: "destructive"
      });
      return;
    }

    setSendingBatch(true);
    let successCount = 0;
    
    try {
      // Only send to selected users
      const usersToSend = newUsersWithoutWelcome.filter(u => selectedNewUsers.includes(u.id));
      
      for (const user of usersToSend) {
        const success = await sendWelcomeEmailToUser(user);
        if (success) successCount++;
        
        // 2 second delay between emails to avoid rate limits
        if (usersToSend.indexOf(user) < usersToSend.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      toast({
        title: "Welcome emails sent!",
        description: `Successfully sent ${successCount} out of ${usersToSend.length} emails`,
      });
      
      loadUsers(); // Refresh everything
      setSelectedNewUsers([]); // Clear selections
    } catch (error) {
      console.error('Error sending batch emails:', error);
      toast({
        title: "Error sending emails",
        description: "Some emails may have failed. Please check and retry.",
        variant: "destructive"
      });
    } finally {
      setSendingBatch(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedNewUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedNewUsers.length === newUsersWithoutWelcome.length) {
      setSelectedNewUsers([]);
    } else {
      setSelectedNewUsers(newUsersWithoutWelcome.map(u => u.id));
    }
  };

  const getDaysAgo = (date: string) => {
    const created = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    return `${diffDays} days ago`;
  };

  return (
    <div className="space-y-4">
      {/* New Users Section with Checkboxes */}
      {newUsersWithoutWelcome.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                <span>New Users Need Welcome Email</span>
              </div>
              <span className="text-sm font-normal text-gray-600">
                Last 3 days
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between px-3 py-2 bg-white rounded-t-lg border-b">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedNewUsers.length === newUsersWithoutWelcome.length && newUsersWithoutWelcome.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm font-medium">Select All</span>
                </div>
                <span className="text-sm text-gray-600">
                  {selectedNewUsers.length} of {newUsersWithoutWelcome.length} selected
                </span>
              </div>
              
              <div className="bg-white rounded-b-lg border max-h-48 overflow-y-auto">
                {newUsersWithoutWelcome.map(user => (
                  <div key={user.id} className="flex items-center gap-3 px-3 py-2 border-b last:border-0 hover:bg-gray-50">
                    <Checkbox
                      checked={selectedNewUsers.includes(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        {user.name || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-3 w-3" />
                      {getDaysAgo(user.created_at)}
                    </div>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={sendBatchWelcomeEmails}
                disabled={sendingBatch || selectedNewUsers.length === 0}
                className="w-full"
                variant="default"
              >
                {sendingBatch ? (
                  <>Sending {selectedNewUsers.length} emails...</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Welcome to {selectedNewUsers.length} Selected User{selectedNewUsers.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No new users message */}
      {newUsersWithoutWelcome.length === 0 && !loading && (
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="pt-6">
            <div className="text-center text-green-700">
              <Check className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">All caught up!</p>
              <p className="text-sm">No new users in the last 3 days need welcome emails.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Single Send Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Send Individual Welcome Email</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={loadUsers}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select Recipient</label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={loading || sending}
            >
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading users..." : "Select a user to send welcome email"} />
              </SelectTrigger>
              <SelectContent>
                <div className="max-h-[400px] overflow-y-auto">
                  {users.map(user => {
                    const wasSent = welcomeSentList[user.id];
                    return (
                      <SelectItem 
                        key={user.id} 
                        value={user.id}
                        className={wasSent ? 'bg-green-50' : ''}
                      >
                        <div className="flex items-center justify-between w-full pr-2">
                          <div className="flex-1">
                            <div className="font-medium">
                              {user.name || 'No name'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {user.email}
                            </div>
                          </div>
                          {wasSent && (
                            <div className="flex items-center gap-1 text-green-600 ml-4">
                              <Check className="h-3 w-3" />
                              <span className="text-xs">
                                Sent {new Date(wasSent).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </div>
              </SelectContent>
            </Select>
            
            {selectedUserId && welcomeSentList[selectedUserId] && (
              <div className="mt-2 flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>This user already received a welcome email</span>
              </div>
            )}
          </div>
          
          <Button 
            onClick={sendSingleWelcomeEmail} 
            disabled={sending || !selectedUserId}
            className="w-full"
          >
            {sending ? 'Sending...' : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Welcome Email
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Email Preview - Collapsed by default */}
      <details>
        <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
          View Email Preview
        </summary>
        <Card className="border-gray-200 mt-2">
          <CardContent className="pt-6">
            <div className="bg-gray-50 p-4 rounded max-h-96 overflow-y-auto">
              <div 
                className="text-sm"
                dangerouslySetInnerHTML={{ 
                  __html: emailTemplate.html
                    .replace(/{{NAME}}/g, 'Neighbor')
                    .replace(/{{LINK}}/g, '#')
                }} 
              />
            </div>
          </CardContent>
        </Card>
      </details>
    </div>
  );
}