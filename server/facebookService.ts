import { FacebookPage } from '../src/types.js';

export interface FacebookServiceConfig {
  configured: boolean;
  hasAppId: boolean;
  hasAppSecret: boolean;
  hasRedirectUri: boolean;
  appId?: string;
  appSecret?: string;
  redirectUri?: string;
  error?: string;
}

export function getFacebookConfig(): FacebookServiceConfig {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI;

  const hasAppId = Boolean(appId && appId.trim());
  const hasAppSecret = Boolean(appSecret && appSecret.trim());
  const hasRedirectUri = Boolean(redirectUri && redirectUri.trim());

  const configured = Boolean(hasAppId && hasAppSecret && hasRedirectUri);

  let error: string | undefined;
  if (!configured) {
    if (hasAppId && hasAppSecret && !hasRedirectUri) {
      error = 'Facebook connection requires a production Redirect URI.';
    } else {
      error = 'Facebook integration is not configured yet. Add FACEBOOK_APP_ID, FACEBOOK_APP_SECRET, and FACEBOOK_REDIRECT_URI in the deployment environment.';
    }
  }

  return {
    configured,
    hasAppId,
    hasAppSecret,
    hasRedirectUri,
    appId,
    appSecret,
    redirectUri,
    error,
  };
}

export function mapOAuthError(code?: string, defaultDetails?: string): { code: string; message: string; details: string } {
  const normalized = (code || '').toLowerCase().trim();

  if (normalized.includes('access_denied') || normalized.includes('user_denied')) {
    return {
      code: 'access_denied',
      message: 'Access Denied: Facebook login was cancelled or permissions were declined.',
      details: defaultDetails || 'You declined or closed the Facebook authorization window before completing authentication.',
    };
  }

  if (normalized.includes('invalid_scope') || normalized.includes('scope')) {
    return {
      code: 'invalid_scope',
      message: 'Invalid Scope: One or more requested Facebook permissions are invalid or restricted.',
      details: defaultDetails || 'Ensure your Meta App Dashboard has the Pages API / Facebook Login for Business use case enabled and permissions (pages_show_list, pages_read_engagement, pages_manage_posts) granted.',
    };
  }

  if (normalized.includes('invalid_redirect') || normalized.includes('redirect_uri')) {
    return {
      code: 'invalid_redirect_uri',
      message: 'Invalid Redirect URI: The FACEBOOK_REDIRECT_URI does not match your Meta App configuration.',
      details: defaultDetails || 'Ensure FACEBOOK_REDIRECT_URI in environment matches the Valid OAuth Redirect URIs setting in Meta Developer Console.',
    };
  }

  if (normalized.includes('invalid_request') || normalized.includes('missing_code')) {
    return {
      code: 'invalid_request',
      message: 'Invalid Request: The OAuth authorization request was incomplete or malformed.',
      details: defaultDetails || 'No valid authorization code was returned by Meta.',
    };
  }

  if (normalized.includes('token_exchange') || normalized.includes('exchange_failed')) {
    return {
      code: 'token_exchange_failed',
      message: 'Token Exchange Failed: Unable to securely exchange code for Facebook access token.',
      details: defaultDetails || 'Meta server declined the authorization code or APP_SECRET verification.',
    };
  }

  return {
    code: 'oauth_error',
    message: 'OAuth Error: Meta authentication failed.',
    details: defaultDetails || 'An unexpected error occurred during Facebook OAuth authorization.',
  };
}

export function getFacebookAuthUrl(state = 'fb_oauth_state'): { configured: boolean; url?: string; redirectUri?: string; error?: string } {
  const config = getFacebookConfig();

  if (!config.configured || !config.appId || !config.redirectUri) {
    return {
      configured: false,
      error: config.error || 'Facebook integration is not configured yet.',
    };
  }

  // Meta Login Configuration ID for Facebook Login for Business
  const configId = process.env.FACEBOOK_CONFIG_ID || '1766952144303436';

  // Standard Facebook Login & Page Management supported permissions
  const scopes = [
    'public_profile',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
  ].join(',');

  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    config_id: configId,
    scope: scopes,
    response_type: 'code',
    state,
  });

  const url = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;

  return {
    configured: true,
    url,
    redirectUri: config.redirectUri,
  };
}

export async function handleFacebookOAuthCallback(
  code: string
): Promise<{
  user: { id: string; name: string };
  userAccessToken: string;
  pages: FacebookPage[];
}> {
  const config = getFacebookConfig();
  if (!config.configured || !config.appId || !config.appSecret || !config.redirectUri) {
    throw new Error(config.error || 'Facebook integration is not configured yet.');
  }

  // 1. Exchange authorization code for short-lived access token
  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', config.appId);
  tokenUrl.searchParams.set('redirect_uri', config.redirectUri);
  tokenUrl.searchParams.set('client_secret', config.appSecret);
  tokenUrl.searchParams.set('code', code);

  const tokenRes = await fetch(tokenUrl.toString());
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error) {
    const msg = tokenData.error?.message || 'Failed to exchange authorization code for Meta token.';
    throw new Error(msg);
  }

  const shortLivedToken = tokenData.access_token;

  // 2. Exchange short-lived token for long-lived user access token
  let longLivedToken = shortLivedToken;
  try {
    const longTokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    longTokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longTokenUrl.searchParams.set('client_id', config.appId);
    longTokenUrl.searchParams.set('client_secret', config.appSecret);
    longTokenUrl.searchParams.set('fb_exchange_token', shortLivedToken);

    const longTokenRes = await fetch(longTokenUrl.toString());
    const longTokenData = await longTokenRes.json();
    if (longTokenRes.ok && longTokenData.access_token) {
      longLivedToken = longTokenData.access_token;
    }
  } catch (err) {
    console.warn('Long-lived Facebook token exchange warning:', err);
  }

  // 3. Fetch User Profile
  const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${longLivedToken}`);
  const meData = await meRes.json();

  if (!meRes.ok || meData.error) {
    throw new Error(meData.error?.message || 'Failed to fetch Facebook user profile.');
  }

  // 4. Fetch User Managed Pages (Attempt retrieving pages if pages_show_list permission is granted)
  let pages: FacebookPage[] = [];
  try {
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,access_token,picture{url}&access_token=${longLivedToken}`
    );
    const pagesData = await pagesRes.json();

    if (pagesRes.ok && Array.isArray(pagesData.data)) {
      pages = pagesData.data.map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category || 'General Page',
        picture: p.picture?.data?.url || '',
        accessToken: p.access_token || '',
      }));
    } else {
      console.info('Facebook /me/accounts notice:', pagesData.error?.message || 'No pages returned or permissions restricted');
    }
  } catch (err) {
    console.warn('Unable to fetch Facebook pages:', err);
  }

  return {
    user: { id: meData.id, name: meData.name },
    userAccessToken: longLivedToken,
    pages,
  };
}
