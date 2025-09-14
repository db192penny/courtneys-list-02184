import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Send, RefreshCw, User } from 'lucide-react';

export function WelcomeEmailTemplate() {
  const { toast } = useToast();
  const [sending, setSending] = useState<string | null>(null);
  const [recentUsers, setRecentUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentEmails, setSentEmails] = useState<string[]>([]);

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
    loadRecentUsers();
  }, []);

  const loadRecentUsers = async () => {
    setLoading(true);
    
    try {
      // Simple query: just get users created in the last 3 days
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const { data: users } = await supabase
        .from('users')
        .select('id, email, name, created_at')
        .gte('created_at', threeDaysAgo.toISOString())
        .eq('is_verified', true)
        .order('created_at', { ascending: false });

      setRecentUsers(users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
    
    setLoading(false);
  };

  const sendWelcomeEmail = async (user: any) => {
    setSending(user.id);
    
    try {
      const finalHtml = emailTemplate.html
        .replace(/{{NAME}}/g, user.name || 'Neighbor')
        .replace(/{{LINK}}/g, `${window.location.origin}/communities/boca-bridges`);
      
      // Match the exact format from 100 homes email
      const { error } = await supabase.functions.invoke('send-community-email', {
        body: {
          to: user.email,  // This is the key - use 'to' not 'recipients'
          subject: emailTemplate.subject,
          html: finalHtml
        }
      });

      if (error) throw error;

      toast({
        title: "Welcome email sent!",
        description: `Sent to ${user.name || user.email}`,
      });
      
      // Add to sent list so it disappears
      setSentEmails(prev => [...prev, user.id]);
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: "Failed to send",
        description: "Please try again",
        variant: "destructive"
      });
    }
    
    setSending(null);
  };

  const getDaysAgo = (date: string) => {
    const created = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Joined today';
    if (diffDays === 1) return 'Joined yesterday';
    return `Joined ${diffDays} days ago`;
  };

  // Filter out users we've already sent to
  const usersToShow = recentUsers.filter(u => !sentEmails.includes(u.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Send Welcome Emails</span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadRecentUsers}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-gray-500">Loading new users...</p>
        ) : usersToShow.length === 0 ? (
          <p className="text-green-600">✓ All welcome emails sent!</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              New users from the last 3 days:
            </p>
            {usersToShow.map(user => (
              <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium">{user.name || 'No name'}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    <div className="text-xs text-gray-400">{getDaysAgo(user.created_at)}</div>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => sendWelcomeEmail(user)}
                  disabled={sending === user.id}
                >
                  {sending === user.id ? 'Sending...' : (
                    <>
                      <Send className="h-4 w-4 mr-1" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}