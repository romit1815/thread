export const onRequest = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const mediaUrl = url.searchParams.get("url");

  if (!mediaUrl) {
    return new Response("URL is required", { status: 400 });
  }

  try {
    const response = await fetch(mediaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.threads.net/',
        'Origin': 'https://www.threads.net'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    return new Response(response.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error("Proxy Error:", error.message);
    return new Response(`Failed to proxy media: ${error.message}`, { status: 500 });
  }
};
