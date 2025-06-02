const generateRandomYouTubeId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const parseBBCode = (text) => {
  if (!text) return '';
  
  let result = text;
  
  result = result
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
  
  result = result.replace(/\[b\](.*?)\[\/b\]/g, '<strong>$1</strong>');
  result = result.replace(/\[i\](.*?)\[\/i\]/g, '<em>$1</em>');
  result = result.replace(/\[s\](.*?)\[\/s\]/g, '<s>$1</s>');
  result = result.replace(/\[u\](.*?)\[\/u\]/g, '<u>$1</u>');
  result = result.replace(/\[h1\](.*?)\[\/h1\]/g, '<h1>$1</h1>');
  
  result = result.replace(/\[url\](https?:\/\/[^"\[\]<>]+?)\[\/url\]/g, 
    '<a href="$1" target="_blank" rel="noopener">$1</a>');
  
  result = result.replace(/\[url=(https?:\/\/[^\]]+)\](.*?)\[\/url\]/g, 
    '<a href="$1" target="_blank" rel="noopener">$2</a>');
  
  result = result.replace(/\[img\](https?:\/\/[^"\[\]<>]+?)\[\/img\]/g, 
    '<img src="$1" alt="User posted image" style="max-width:100%;">');

  result = result.replace(/\[quote\](.*?)\[\/quote\]/g, '<blockquote>$1</blockquote>');

  result = result.replace(/\[code\](.*?)\[\/code\]/g, '<pre><code>$1</code></pre>');

  result = result.replace(/\[list\](.*?)\[\/list\]/g, (match, content) => {
    const items = content.split('[*]').filter(item => item.trim());
    const listItems = items.map(item => `<li>${item.trim()}</li>`).join('');
    return `<ul>${listItems}</ul>`;
  });

  result = result.replace(/\[(youtube|yt)(?:\s+([^\]]+))?\]/g, (match, tag, attrs) => {
    const randomVideo = generateRandomYouTubeId();
    
    if (!attrs) {
      return `<iframe src="https://www.youtube.com/embed/${randomVideo}" width="560" height="315"></iframe>`;
    }
    
    let iframeHtml = '<iframe ';
    let videoId = null;
    
    const attrRegex = /(\w+)=(?:"([^"]*)"|'([^']*)'|([^\s\]]+))/g;
    let attrMatch;
    
    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      const key = attrMatch[1];
      const value = attrMatch[2] || attrMatch[3] || attrMatch[4];
      
      const keyLower = key.toLowerCase();
      
      if (keyLower.startsWith('on')) {
        continue;
      }
      
      if (keyLower === 'src') {
        continue; 
      }
      
      if (keyLower === 'id') {
        videoId = value;
        continue;
      }

      const unescapedValue = value
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
      
      const escapedValue = unescapedValue.replace(/"/g, '&quot;');
      
      iframeHtml += `${key}="${escapedValue}" `;
    }
    
    iframeHtml += `src="https://www.youtube.com/embed/${videoId || randomVideo}" `;
    
    if (!attrs.includes('width')) iframeHtml += 'width="560" ';
    if (!attrs.includes('height')) iframeHtml += 'height="315" ';
    
    iframeHtml += '></iframe>';
    
    return iframeHtml;
  });
  
  return result;
};

export default parseBBCode;