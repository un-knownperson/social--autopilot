export interface PublishOptions {
  pageId: string;
  pageAccessToken: string;
  message: string;
}

export interface PublishResult {
  id: string;
  facebookPostUrl: string;
}

export async function publishToFacebookPage(options: PublishOptions): Promise<PublishResult> {
  const { pageId, pageAccessToken, message } = options;

  if (!pageId || !pageAccessToken) {
    throw new Error('Facebook Page ID and Page Access Token are required for publishing.');
  }

  if (!message || !message.trim()) {
    throw new Error('Post message content cannot be empty.');
  }

  const publishUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/feed`;

  const response = await fetch(publishUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      access_token: pageAccessToken,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const errorMsg = data.error?.message || 'Failed to publish post to Facebook Page via Meta Graph API.';
    throw new Error(errorMsg);
  }

  const postId = data.id as string;
  // Facebook post URLs are generally formatted as https://facebook.com/{postId}
  const facebookPostUrl = `https://facebook.com/${postId}`;

  return {
    id: postId,
    facebookPostUrl,
  };
}
