export function getDeviceInfo(): string {
  if (typeof window === 'undefined') return 'Unknown Device';
  
  const ua = navigator.userAgent;
  let deviceName = 'Unknown Device';
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';
  
  // OS Detection
  if (/android/i.test(ua)) {
    os = 'Android';
    const match = ua.match(/Android\s([0-9.]+)/);
    if (match) os = `Android ${match[1]}`;
  } else if (/iPad|iPhone|iPod/.test(ua)) {
    os = 'iOS';
    const match = ua.match(/OS\s([0-9_]+)/);
    if (match) os = `iOS ${match[1].replace(/_/g, '.')}`;
  } else if (/Windows NT/.test(ua)) {
    os = 'Windows';
    if (/Windows NT 10/.test(ua)) os = 'Windows 10/11';
    else if (/Windows NT 6.3/.test(ua)) os = 'Windows 8.1';
    else if (/Windows NT 6.2/.test(ua)) os = 'Windows 8';
  } else if (/Mac OS X/.test(ua)) {
    os = 'macOS';
    const match = ua.match(/Mac OS X ([0-9_]+)/);
    if (match) os = `macOS ${match[1].replace(/_/g, '.')}`;
  } else if (/Linux/.test(ua)) {
    os = 'Linux';
  }
  
  // Browser Detection
  if (/Edg\//.test(ua)) {
    browser = 'Edge';
  } else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) {
    browser = 'Chrome';
  } else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) {
    browser = 'Safari';
  } else if (/Firefox\//.test(ua)) {
    browser = 'Firefox';
  } else if (/OPR\/|Opera/.test(ua)) {
    browser = 'Opera';
  }
  
  // Specific Device Detection
  if (/iPhone/.test(ua)) {
    deviceName = 'iPhone';
    if (/iPhone OS 17/.test(ua)) deviceName = 'iPhone (iOS 17)';
    else if (/iPhone OS 16/.test(ua)) deviceName = 'iPhone (iOS 16)';
    else if (/iPhone OS 15/.test(ua)) deviceName = 'iPhone (iOS 15)';
  } else if (/iPad/.test(ua)) {
    deviceName = 'iPad';
  } else if (/Samsung|SM-/.test(ua)) {
    deviceName = 'Samsung Galaxy';
    const match = ua.match(/SM-([A-Z0-9]+)/);
    if (match) deviceName = `Samsung ${match[1]}`;
  } else if (/Pixel/.test(ua)) {
    deviceName = 'Google Pixel';
    const match = ua.match(/Pixel\s([0-9A-Z]+)/);
    if (match) deviceName = `Pixel ${match[1]}`;
  } else if (/OnePlus/.test(ua)) {
    deviceName = 'OnePlus';
  } else if (/Huawei/.test(ua)) {
    deviceName = 'Huawei';
  } else if (/Xiaomi/.test(ua)) {
    deviceName = 'Xiaomi';
  } else if (/Android/.test(ua)) {
    deviceName = 'Android Device';
  } else if (/Macintosh/.test(ua)) {
    deviceName = 'MacBook / iMac';
  } else if (/Windows/.test(ua)) {
    deviceName = 'Windows PC';
  } else if (/Linux/.test(ua)) {
    deviceName = 'Linux PC';
  }

  // Fallback to generic types if specific name not found
  if (deviceName === 'Unknown Device') {
    if (/Mobile|Android/.test(ua) && !/iPad/.test(ua)) {
      deviceName = 'Mobile Device';
    } else if (/iPad|Tablet/.test(ua)) {
      deviceName = 'Tablet';
    } else {
      deviceName = 'Desktop';
    }
  }
  
  return `${deviceName} • ${browser} • ${os}`;
}
