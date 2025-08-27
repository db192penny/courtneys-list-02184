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
  userEmail: string
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
  userEmail,
}: MagicLinkEmailProps) => {
  const firstName = name ? name.split(' ')[0] : 'there'
  const neighborhoodName = communityName || 'Your Neighborhood'
  
  return (
    <Html>
      <Head />
      <Preview>{neighborhoodName} Access is Ready - Unlock it Now</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={text}>
            Hi {firstName},
          </Text>
          
          <Text style={text}>
            Excited to have you back! Please click here to return to the {neighborhoodName} list:
          </Text>
          
          <Link
            href={`${supabase_url}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`}
            target="_blank"
            style={{
              ...link,
              display: 'block',
              marginBottom: '24px',
              backgroundColor: '#007bff',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              textAlign: 'center' as const,
            }}
          >
            See List of Providers
          </Link>
          
          <Text style={text}>
            I hope this list makes your life a little easier. And thanks for all your contributions.
          </Text>
          
          <Text style={signature}>
            Cheers,<br/>
            Courtney
          </Text>
          
          <Text style={unsubscribe}>
            <Link
              href={`https://courtneys-list.com/unsubscribe?email=${encodeURIComponent(userEmail)}`}
              target="_blank"
              style={{ color: '#ccc', textDecoration: 'underline' }}
            >
              Unsubscribe
            </Link>
            {' | '}
            <Link
              href="https://courtneys-list.com/contact"
              target="_blank"
              style={{ color: '#ccc', textDecoration: 'underline' }}
            >
              Contact Us
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

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

const signature = {
  color: '#333',
  fontSize: '14px',
  margin: '24px 0',
  lineHeight: '1.5',
}

const unsubscribe = {
  color: '#ccc',
  fontSize: '12px',
  lineHeight: '18px',
  marginTop: '24px',
  marginBottom: '12px',
  textAlign: 'center' as const,
  borderTop: '1px solid #eee',
  paddingTop: '16px',
}