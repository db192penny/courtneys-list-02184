import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface MagicLinkEmailProps {
  name: string
  communityName?: string
  signupSource?: string
  supabase_url: string
  email_action_type: string
  redirect_to: string
  token_hash: string
  token: string
}

export const MagicLinkEmail = ({
  name,
  communityName,
  signupSource,
  token,
  supabase_url,
  email_action_type,
  redirect_to,
  token_hash,
}: MagicLinkEmailProps) => {
  const isHomepageSignup = signupSource?.startsWith('homepage:')
  const isCommunitySignup = signupSource?.startsWith('community:')
  
  const welcomeMessage = communityName
    ? `Welcome to Courtney's List for ${communityName}!`
    : `Welcome to Courtney's List!`

  const personalizedContent = isHomepageSignup
    ? `Thanks for joining from our homepage! We're excited to connect you with your community's trusted vendors.`
    : isCommunitySignup
    ? `Thanks for joining through your community invitation! Your neighbors are already sharing their trusted vendor recommendations.`
    : `Thanks for joining Courtney's List! We're excited to help you discover trusted vendors in your community.`

  return (
    <Html>
      <Head />
      <Preview>🎉 VIP Access Granted - Your magic link inside!</Preview>
      <Body style={main}>
        <Container style={container}>
          <div style={header}>
            <Heading style={h1}>{welcomeMessage}</Heading>
            <Text style={vipBadge}>🌟 VIP ACCESS GRANTED 🌟</Text>
          </div>
          
          <div style={contentBox}>
            <Text style={greeting}>Hi {name},</Text>
            
            <Text style={text}>{personalizedContent}</Text>
            
            <Text style={text}>
              <strong>Good news!</strong> You've been automatically verified as part of our VIP test group. 
              Click the button below to access your exclusive vendor directory:
            </Text>
            
            <div style={buttonContainer}>
              <Link
                href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
                style={button}
              >
                🚪 VIP - Let Me In The Door!
              </Link>
            </div>
            
            <div style={benefitsBox}>
              <Text style={benefitsTitle}>Your VIP Access Includes:</Text>
              <ul style={benefitsList}>
                <li style={benefitItem}><strong>Trusted Vendor Directory</strong> - Discover vetted service providers your neighbors recommend</li>
                <li style={benefitItem}><strong>Real Cost Insights</strong> - See what your neighbors actually paid for services</li>
                <li style={benefitItem}><strong>Community Reviews</strong> - Read honest feedback from people in your area</li>
                <li style={benefitItem}><strong>Share & Earn</strong> - Contribute your own experiences and build community trust</li>
              </ul>
            </div>
            
            <Text style={alternativeText}>
              Or, copy and paste this temporary login code:
            </Text>
            <code style={code}>{token}</code>
          </div>
          
          <div style={footer}>
            <Text style={footerText}>
              Questions? Just reply to this email - we're here to help!
            </Text>
            <Text style={footerText}>
              Best regards,<br />
              The Courtney's List Team
            </Text>
          </div>
        </Container>
      </Body>
    </Html>
  )
}

export default MagicLinkEmail

const main = {
  backgroundColor: '#f8fafc',
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
}

const container = {
  margin: '0 auto',
  padding: '20px',
  maxWidth: '600px',
}

const header = {
  textAlign: 'center' as const,
  marginBottom: '30px',
}

const h1 = {
  color: '#2563eb',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
}

const vipBadge = {
  backgroundColor: '#fbbf24',
  color: '#92400e',
  fontSize: '14px',
  fontWeight: 'bold',
  padding: '8px 16px',
  borderRadius: '20px',
  display: 'inline-block',
  margin: '0',
}

const contentBox = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  padding: '32px',
  marginBottom: '24px',
  border: '1px solid #e2e8f0',
}

const greeting = {
  color: '#334155',
  fontSize: '18px',
  fontWeight: '600',
  margin: '0 0 20px 0',
}

const text = {
  color: '#334155',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '16px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  textDecoration: 'none',
  padding: '14px 28px',
  borderRadius: '8px',
  fontWeight: '600',
  fontSize: '16px',
  display: 'inline-block',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
}

const benefitsBox = {
  backgroundColor: '#f1f5f9',
  borderRadius: '6px',
  padding: '20px',
  margin: '24px 0',
}

const benefitsTitle = {
  color: '#1e293b',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 12px 0',
}

const benefitsList = {
  color: '#334155',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0',
  paddingLeft: '20px',
}

const benefitItem = {
  marginBottom: '8px',
}

const alternativeText = {
  color: '#64748b',
  fontSize: '14px',
  margin: '24px 0 12px 0',
  textAlign: 'center' as const,
}

const code = {
  display: 'block',
  backgroundColor: '#f1f5f9',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  color: '#1e293b',
  fontSize: '16px',
  fontWeight: '600',
  padding: '12px',
  textAlign: 'center' as const,
  letterSpacing: '2px',
  margin: '0 0 24px 0',
}

const footer = {
  borderTop: '1px solid #e2e8f0',
  paddingTop: '24px',
  marginTop: '32px',
}

const footerText = {
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '0 0 16px 0',
}