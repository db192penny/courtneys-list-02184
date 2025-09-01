import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, Share2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

export function SimpleInvite() {
  const [inviteUrl, setInviteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
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
      const url = `${baseUrl}/communities/boca-bridges?invite=${code}&welcome=true`;
      setInviteUrl(url);

      // Try to copy automatically
      const copySuccess = await copyToClipboard(url);
      if (copySuccess) {
        toast({ 
          title: 'Invite link copied!',
          description: 'Share it with your neighbor.' 
        });
      } else {
        // Show modal if copy failed
        setShowModal(true);
      }
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

  const handleModalCopy = async () => {
    const copySuccess = await copyToClipboard(inviteUrl);
    if (copySuccess) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ 
        title: 'Invite link copied!',
        description: 'Share it with your neighbor.' 
      });
    }
  };

  return (
    <>
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

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Share Courtney's List to Boca Bridges Neighbors
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copy this link and share it with your neighbor:
            </p>
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <input
                  className="px-3 py-2 text-sm border rounded-md bg-muted"
                  value={inviteUrl}
                  readOnly
                />
              </div>
              <Button size="sm" onClick={handleModalCopy}>
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}