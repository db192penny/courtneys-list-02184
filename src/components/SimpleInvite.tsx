import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Copy, Share2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
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
      // Generate simple random code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();

      // Use raw SQL to insert since TypeScript doesn't know about our table
      const { error } = await supabase.rpc('sql' as any, {
        query: `
          INSERT INTO simple_invites (code, inviter_id)
          VALUES ('${code}', '${user.id}')
        `
      }).catch(() => {
        // If 'sql' RPC doesn't exist, try alternative approach
        return supabase.from('simple_invites' as any)
          .insert({ code, inviter_id: user.id });
      });

      if (error) throw error;

      // Simple URL - just community page with code
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/community?invite=${code}`;
      setInviteUrl(url);

      toast({ 
        title: 'Invite link generated!',
        description: 'Share this with your neighbors' 
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

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast({ title: 'Copied to clipboard!' });
    } catch (error) {
      toast({ 
        title: 'Failed to copy', 
        variant: 'destructive' 
      });
    }
  };

  return (
    <div className="p-6 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Invite Neighbors</h3>
      
      {!inviteUrl ? (
        <Button 
          onClick={generateInvite} 
          disabled={loading}
          className="w-full sm:w-auto"
        >
          <Share2 className="w-4 h-4 mr-2" />
          {loading ? 'Generating...' : 'Generate Invite Link'}
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2 items-center">
            <input 
              value={inviteUrl} 
              readOnly 
              className="flex-1 px-3 py-2 border rounded-md text-sm bg-gray-50"
              onClick={(e) => e.currentTarget.select()}
            />
            <Button 
              onClick={copyLink} 
              size="sm"
              variant="outline"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <Button 
            onClick={generateInvite} 
            variant="outline" 
            size="sm"
            className="w-full sm:w-auto"
          >
            Generate New Link
          </Button>
        </div>
      )}
    </div>
  );
}