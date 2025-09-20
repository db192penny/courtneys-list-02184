import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, MessageCircle, Users, Star, DollarSign, Check } from 'lucide-react';
import { getCategoryIcon } from '@/utils/categoryIcons';

interface VendorStats {
  vendor_count: number;
  total_reviews: number;
  avg_rating: number;
  top_vendor_name?: string;
  top_vendor_rating?: number;
  top_vendor_review_count?: number;
}

interface ReviewData {
  user_name: string;
  street_name: string;
  rating: number;
}

interface CategoryData {
  name: string;
  stats: VendorStats;
  reviews: ReviewData[];
  hasCostData: boolean;
}

const CATEGORIES = [
  'Pool',
  'Plumbing', 
  'HVAC',
  'Electrical',
  'Landscaping',
  'Pest Control',
  'House Cleaning',
  'Handyman',
  'Power Washing',
  'Painters'
];

export function MessageBoardHelper() {
  const [recipientName, setRecipientName] = useState('there');
  const [copiedCategory, setCopiedCategory] = useState<string | null>(null);
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { toast } = useToast();

  // Early returns for admin check
  if (adminLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Verifying admin access...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
          <p className="text-muted-foreground">
            You need admin permissions to access the Message Board Helper.
          </p>
        </div>
      </div>
    );
  }

  const copyToClipboard = async (text: string, category: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      
      setCopiedCategory(category);
      setTimeout(() => setCopiedCategory(null), 2000);
      
      toast({
        title: '📋 Message Copied!',
        description: `${category} message ready to post on Facebook/WhatsApp`,
        className: "bg-green-50 border-green-500 border-2"
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Please try again',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <MessageCircle className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Message Board Helper</h1>
            <p className="text-muted-foreground">
              Generate quick responses for Facebook/WhatsApp groups
            </p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            Recipient Name (e.g., "Sarah", "everyone", "there")
          </label>
          <Input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="there"
            className="max-w-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CATEGORIES.map((category) => (
          <CategoryCard
            key={category}
            category={category}
            recipientName={recipientName}
            onCopy={copyToClipboard}
            isCopied={copiedCategory === category}
          />
        ))}
      </div>
    </div>
  );
}

interface CategoryCardProps {
  category: string;
  recipientName: string;
  onCopy: (message: string, category: string) => void;
  isCopied: boolean;
}

function CategoryCard({ category, recipientName, onCopy, isCopied }: CategoryCardProps) {
  const { toast } = useToast();
  
  // Fetch category data
  const { data: stats, isLoading: statsLoading } = useQuery<VendorStats>({
    queryKey: ['category-stats', category],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_vendor_stats', {
        _hoa_name: 'Boca Bridges',
        _category: category,
        _sort_by: 'hoa_rating',
        _limit: 100,
        _offset: 0
      });
      
      if (error) throw error;
      
      // Process the data to get stats
      const vendorCount = data?.length || 0;
      const totalReviews = data?.reduce((sum: number, vendor: any) => sum + (vendor.hoa_rating_count || 0), 0) || 0;
      const topVendor = data?.[0];
      
      return {
        vendor_count: vendorCount,
        total_reviews: totalReviews,
        avg_rating: topVendor?.hoa_rating || 0,
        top_vendor_name: topVendor?.name,
        top_vendor_rating: topVendor?.hoa_rating,
        top_vendor_review_count: topVendor?.hoa_rating_count
      };
    }
  });

  const { data: reviews } = useQuery<ReviewData[]>({
    queryKey: ['category-reviews', category],
    queryFn: async () => {
      if (!stats?.top_vendor_name) return [];
      
      // Find the top vendor by name to get its ID
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id')
        .ilike('name', stats.top_vendor_name)
        .eq('category', category)
        .limit(1);
        
      if (!vendors?.[0]) return [];
      
      const { data, error } = await supabase.rpc('list_vendor_reviews', {
        _vendor_id: vendors[0].id
      });
      
      if (error) return [];
      
      return data?.slice(0, 3).map((review: any) => ({
        user_name: review.author_label?.split('|')[0] || 'Neighbor',
        street_name: review.author_label?.split('|')[1] || '',
        rating: review.rating
      })) || [];
    },
    enabled: !!stats?.top_vendor_name
  });

  const { data: hasCostData } = useQuery<boolean>({
    queryKey: ['category-costs', category],
    queryFn: async () => {
      const { data } = await supabase
        .from('costs')
        .select('id, vendors!inner(category)')
        .eq('vendors.category', category)
        .limit(1);
        
      return (data?.length || 0) > 0;
    }
  });

  const generateMessage = () => {
    if (!stats) return '';
    
    const categoryUrl = `https://courtneys-list.com/communities/boca-bridges/vendors?category=${encodeURIComponent(category)}`;
    
    // Format reviewer names
    const reviewerNames = reviews?.filter(r => r.user_name !== 'Neighbor')
      .slice(0, 3)
      .map(r => {
        const name = r.user_name;
        const street = r.street_name;
        return street ? `${name} on ${street}` : name;
      }).join(', ') || '';
      
    const fiveStarCount = reviews?.filter(r => r.rating === 5).length || 0;
    
    const costText = hasCostData ? ' Cost data is in the list as well if helpful.' : '';
    
    return `Hey ${recipientName}! 👋 

Here are ${stats.vendor_count} ${category.toLowerCase()} vendor${stats.vendor_count !== 1 ? 's' : ''} and ${stats.total_reviews} detailed review${stats.total_reviews !== 1 ? 's' : ''} all from Boca Bridges neighbors, many on this thread: ${categoryUrl}

To summarize, ${stats.top_vendor_name || 'our top vendor'} is the highest rated with ${stats.top_vendor_rating?.toFixed(1) || '0'}★ (${stats.top_vendor_review_count || 0} neighbor${(stats.top_vendor_review_count || 0) !== 1 ? 's' : ''})${reviewerNames ? ` with positive reviews from ${reviewerNames}` : ''}${fiveStarCount > 1 ? `, and there are ${fiveStarCount - 1} others with 5 star reviews` : ''}.${costText}`;
  };

  const message = generateMessage();
  const IconComponent = getCategoryIcon(category as any);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <IconComponent className="w-5 h-5 text-primary" />
          {category}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {statsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : stats ? (
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{stats.vendor_count} vendor{stats.vendor_count !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              <span>{stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''}</span>
            </div>
            {stats.top_vendor_name && (
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                <span className="truncate">
                  {stats.top_vendor_name} ({stats.top_vendor_rating?.toFixed(1)}★)
                </span>
              </div>
            )}
            {hasCostData && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>Cost data available</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No data available</p>
        )}
        
        <Button
          onClick={() => onCopy(message, category)}
          disabled={!stats || statsLoading}
          className="w-full"
          variant={isCopied ? "default" : "outline"}
        >
          {isCopied ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy Message
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}