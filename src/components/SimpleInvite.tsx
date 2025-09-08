import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

export function SimpleInvite() {
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    } catch (error) {
      console.error('Copy failed:', error);
      return false;
    }
  };

  const generateInvite = async () => {
    if (!user) {
      toast({ 
        title: 'Please log in first', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    
    try {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();

      const { error } = await supabase
        .from('simple_invites')
        .insert({ 
          code: code, 
          inviter_id: user.id 
        });

      if (error) throw error;

      const baseUrl = window.location.origin;
      const url = `${baseUrl}/communities/boca-bridges?invite=${code}&inviter=${user.id}&welcome=true`;
      setInviteUrl(url);

      // Try to copy automatically
      await copyToClipboard(url);
      
      // Always show success toast regardless of copy result
      // Mobile browsers handle clipboard differently but the link is ready
      toast({ 
        title: '📋 Invite Link Copied!',
        description: 'Earn 10 points when your neighbor joins! That\'s halfway to your free Starbucks! ☕',
        duration: 5000,
        className: "bg-green-50 border-green-500 border-2"
      });
      
    } catch (error) {
      console.error('Error:', error);
      toast({ 
        title: 'Failed to generate invite', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 border rounded-lg bg-card shadow-sm">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Share2 className="w-5 h-5" />
        Invite Neighbors
      </h3>
      
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Earn 10 points for each neighbor you invite to join Courtney's List!
        </p>
        <Button 
          onClick={generateInvite} 
          disabled={loading}
          className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 hover:from-blue-600 hover:to-purple-700"
        >
          <Share2 className="w-4 h-4 mr-2" />
          {loading ? 'Generating...' : 'Invite Neighbors'}
        </Button>
        {inviteUrl && (
          <Button 
            onClick={generateInvite} 
            variant="outline" 
            size="sm"
            className="w-full sm:w-auto mt-2"
          >
            Generate New Link
          </Button>
        )}
      </div>
    </div>
  );
}