export const onRequest = async (context) => {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url");

  // CORS Headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle Preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!targetUrl) {
    return new Response(JSON.stringify({ success: false, error: "URL parameter is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Validate URL
    const parsedUrl = new URL(targetUrl);
    if (!parsedUrl.hostname.includes("threads.net") && !parsedUrl.hostname.includes("threads.com")) {
      return new Response(JSON.stringify({ success: false, error: "Invalid Threads URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the Threads page
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch Threads page");
    }

    const html = await response.text();

    // Extract media URLs from meta tags
    const videoMatch = html.match(/<meta[^>]*property=["']og:video["'][^>]*content=["']([^"']+)["']/i);
    const imageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);

    if (videoMatch) {
      return new Response(JSON.stringify({
        success: true,
        type: "video",
        url: videoMatch[1].replace(/&amp;/g, "&"),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else if (imageMatch) {
      return new Response(JSON.stringify({
        success: true,
        type: "image",
        url: imageMatch[1].replace(/&amp;/g, "&"),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: "Media not found on this page" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

