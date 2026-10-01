export function parseUserAgent(ua?: string) {
  if (!ua) {
    return { device: 'Desktop', os: 'Windows 11', browser: 'Chrome 122' };
  }
  const uaLower = ua.toLowerCase();
  let os = 'Windows';
  if (uaLower.includes('macintosh') || uaLower.includes('mac os')) os = 'macOS';
  else if (uaLower.includes('iphone')) os = 'iOS (iPhone)';
  else if (uaLower.includes('ipad')) os = 'iPadOS';
  else if (uaLower.includes('android')) os = 'Android';
  else if (uaLower.includes('linux')) os = 'Linux';

  let browser = 'Chrome';
  if (uaLower.includes('edg/')) browser = 'Microsoft Edge';
  else if (uaLower.includes('firefox')) browser = 'Firefox';
  else if (uaLower.includes('safari') && !uaLower.includes('chrome')) browser = 'Safari';
  else if (uaLower.includes('opr/') || uaLower.includes('opera')) browser = 'Opera';

  let device = 'Desktop';
  if (uaLower.includes('mobile') || uaLower.includes('iphone') || (uaLower.includes('android') && !uaLower.includes('tablet'))) {
    device = 'Smartphone';
  } else if (uaLower.includes('tablet') || uaLower.includes('ipad')) {
    device = 'Tablet';
  }

  return { device, os, browser };
}
