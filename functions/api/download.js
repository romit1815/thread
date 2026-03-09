export const onRequest = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const mediaUrl = url.searchParams.get("url");
  const type = url.searchParams.get("type");

  if (!mediaUrl) {
    return new Response("URL is required", { status: 400 });
  }

  try {
    const response = await fetch(mediaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.threads.net/',
        'Origin': 'https://www.threads.net'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const extension = type === 'video' ? 'mp4' : 'jpg';
    const contentType = response.headers.get('content-type') || (type === 'video' ? 'video/mp4' : 'image/jpeg');
    
    const headers = new Headers(response.headers);
    headers.set('Content-Disposition', `attachment; filename="threads_media_${Date.now()}.${extension}"`);
    headers.set('Content-Type', contentType);
    headers.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      headers: headers
    });
  } catch (error) {
    console.error("Download Error:", error.message);
    return new Response(`Failed to download: ${error.message}`, { status: 500 });
  }
};
