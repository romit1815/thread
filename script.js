// Shared logic for Threads Downloader
document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('download-btn');
  const urlInput = document.getElementById('url-input');
  const resultSection = document.getElementById('result-section');
  const errorSection = document.getElementById('error-section');
  const loadingSpinner = document.getElementById('loading-spinner');
  const downloadText = document.getElementById('download-text');
  
  const mediaPreview = document.getElementById('media-preview');
  const mediaTypeLabel = document.getElementById('media-type-label');
  const saveBtn = document.getElementById('save-btn');
  const anotherBtn = document.getElementById('another-btn');

  if (!downloadBtn) return;

  const isValidThreadsUrl = (url) => {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname.includes('threads.net') || parsedUrl.hostname.includes('threads.com');
    } catch (e) {
      return false;
    }
  };

  const handleDownload = async () => {
    const url = urlInput.value.trim();
    if (!url) return;

    if (!isValidThreadsUrl(url)) {
      showError('Invalid Threads URL. Please use a link from threads.net or threads.com.');
      return;
    }

    // Reset UI
    errorSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    loadingSpinner.classList.remove('hidden');
    downloadText.classList.add('hidden');
    downloadBtn.disabled = true;

    try {
      // Fetch from the API endpoint (works on both local and Cloudflare Pages)
      let data;
      try {
        const apiUrl = `/api/fetch-media?url=${encodeURIComponent(url)}`;
        const response = await fetch(apiUrl);
        data = await response.json();
      } catch (apiErr) {
        console.warn("API call failed", apiErr);
        // Fallback to direct worker call if available
        try {
          const workerUrl = `https://threads-downloader-api.${window.location.hostname.split('.').slice(-2).join('.')}/api/fetch-media?url=${encodeURIComponent(url)}`;
          const response = await fetch(workerUrl);
          data = await response.json();
        } catch (workerErr) {
          throw new Error('Unable to fetch media. Please check the URL.');
        }
      }

      if (data.success) {
        // Show result
        mediaTypeLabel.textContent = data.type.toUpperCase();
        
        // Use proxy for preview to bypass hotlinking protections
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(data.url)}`;
        
        if (data.type === 'video') {
          // For video, we use the direct URL for the video source (usually works)
          // but use the proxy for the poster image
          mediaPreview.innerHTML = `<video src="${data.url}" controls class="w-full h-full object-contain" poster="${proxyUrl}" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML='<div class=&quot;p-8 text-center text-slate-400&quot;>Video failed to load. You can still try to save it.</div>'"></video>`;
        } else {
          // For images, we use the proxy URL
          mediaPreview.innerHTML = `<img src="${proxyUrl}" alt="Threads Media" class="w-full h-full object-contain" referrerpolicy="no-referrer" onerror="this.parentElement.innerHTML='<div class=&quot;p-8 text-center text-slate-400&quot;>Image failed to load. You can still try to save it.</div>'">`;
        }

        // Setup save button with blob download logic
        saveBtn.onclick = async (e) => {
          e.preventDefault();
          const originalText = saveBtn.innerHTML;
          try {
            saveBtn.innerHTML = '<span>Downloading...</span>';
            saveBtn.style.pointerEvents = 'none';
            saveBtn.style.opacity = '0.7';

            const downloadUrl = `/api/download?url=${encodeURIComponent(data.url)}&type=${data.type}`;
            const response = await fetch(downloadUrl);
            
            if (!response.ok) {
              const errorData = await response.text();
              throw new Error(errorData || 'Download failed');
            }

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = blobUrl;
            const extension = data.type === 'video' ? 'mp4' : 'jpg';
            a.download = `threads_${Date.now()}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
          } catch (err) {
            console.error('Download error:', err);
            showError(`Download failed: ${err.message}. You can try to open the media directly.`);
            setTimeout(() => {
              window.open(data.url, '_blank');
            }, 2000);
          } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.style.pointerEvents = 'auto';
            saveBtn.style.opacity = '1';
          }
        };

        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        showError(data.error || "Could not find media in this post. Make sure it's a public post.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      showError(`Error: ${err.message || "An error occurred while fetching the media. Please try again."}`);
    } finally {
      loadingSpinner.classList.add('hidden');
      downloadText.classList.remove('hidden');
      downloadBtn.disabled = false;
    }
  };

  const showError = (msg) => {
    errorSection.textContent = msg;
    errorSection.classList.remove('hidden');
    errorSection.scrollIntoView({ behavior: 'smooth' });
  };

  downloadBtn.addEventListener('click', handleDownload);
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleDownload();
  });

  if (anotherBtn) {
    anotherBtn.addEventListener('click', () => {
      urlInput.value = '';
      resultSection.classList.add('hidden');
      errorSection.classList.add('hidden');
      urlInput.focus();
    });
  }
});
