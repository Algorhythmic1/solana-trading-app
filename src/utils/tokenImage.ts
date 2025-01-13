export const getValidImageUrl = (url: string | undefined): string => {
  if (!url) return '';
  
  // Handle IPFS URLs
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }

  // Ensure HTTPS for HTTP URLs
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }

  // Handle relative URLs (if any)
  if (url.startsWith('/')) {
    return `https://token.jup.ag${url}`;
  }

  return url;
};