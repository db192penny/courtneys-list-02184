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
  communityName: string
  signupSource: string
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
}: MagicLinkEmailProps) => (
  <Html>
    <Head />
    <Preview>🎉 VIP Access Granted - Your magic link inside!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🎉 VIP Access Granted!</Heading>
        
        <Text style={text}>
          Hi {name}!
        </Text>
        
        {communityName && (
          <Text style={text}>
            Welcome to the <strong>{communityName}</strong> community on Courtney's List!
          </Text>
        )}
        
        <Text style={text}>
          Click the magic link below to access your account:
        </Text>
        
        <Link
          href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
          target="_blank"
          style={{
            ...link,
            display: 'block',
            marginBottom: '16px',
            backgroundColor: '#007bff',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '6px',
            textDecoration: 'none',
            textAlign: 'center' as const,
          }}
        >
          Access Your Account ✨
        </Link>
        
        <Text style={{ ...text, marginBottom: '14px' }}>
          Or, copy and paste this temporary login code:
        </Text>
        <code style={code}>{token}</code>
        
        <Text style={text}>
          Once you're in, you'll be able to:
        </Text>
        <Text style={text}>
          • Discover trusted local vendors in your community<br/>
          • Share your own vendor recommendations<br/>
          • Access exclusive pricing from neighbors<br/>
          • Connect with fellow community members
        </Text>
        
        <Text
          style={{
            ...text,
            color: '#ababab',
            marginTop: '14px',
            marginBottom: '16px',
          }}
        >
          If you didn't request this, you can safely ignore this email.
        </Text>
        
        <Text style={footer}>
          Happy exploring!<br/>
          <Link
            href="https://courtneys-list.com"
            target="_blank"
            style={{ ...link, color: '#898989' }}
          >
            Courtney's List
          </Link>
          - Your neighborhood vendor directory
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
}

const container = {
  paddingLeft: '12px',
  paddingRight: '12px',
  margin: '0 auto',
  maxWidth: '600px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
}

const link = {
  color: '#2754C5',
  fontSize: '14px',
  textDecoration: 'underline',
}

const text = {
  color: '#333',
  fontSize: '14px',
  margin: '24px 0',
  lineHeight: '1.5',
}

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '22px',
  marginTop: '24px',
  marginBottom: '24px',
  textAlign: 'center' as const,
}

const code = {
  display: 'inline-block',
  padding: '16px 4.5%',
  width: '90.5%',
  backgroundColor: '#f4f4f4',
  borderRadius: '5px',
  border: '1px solid #eee',
  color: '#333',
  fontFamily: 'monospace',
}