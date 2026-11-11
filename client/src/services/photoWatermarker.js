/**
 * photoWatermarker.js
 * Client-side Canvas photo watermarking for Natural Milk Dairy.
 * Burns verification banner, exact real-time timestamp, doorstep location, customer name,
 * and delivery partner name directly into the image pixels before upload.
 */

export async function watermarkDeliveryPhoto(file, { customerName = 'Customer', address = '', partnerName = 'Partner' } = {}) {
  if (!file) return file;

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Limit max dimensions for optimal upload speed while preserving crispness
          const maxDim = 1600;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          // 1. Draw base photo
          ctx.drawImage(img, 0, 0, w, h);

          // 2. Format realtime timestamp
          const now = new Date();
          const dateStr = now.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
          const timeStr = now.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          });
          const fullTimestamp = `${dateStr}, ${timeStr}`;

          // 3. Calculate banner proportions
          const bannerHeight = Math.max(90, Math.round(h * 0.16));
          const bannerY = h - bannerHeight;

          // Semi-transparent dark emerald backdrop gradient
          const grad = ctx.createLinearGradient(0, bannerY, 0, h);
          grad.addColorStop(0, 'rgba(11, 30, 20, 0.94)');
          grad.addColorStop(1, 'rgba(5, 20, 12, 0.98)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, bannerY, w, bannerHeight);

          // Emerald highlight top border line
          ctx.fillStyle = '#059669';
          ctx.fillRect(0, bannerY, w, Math.max(3, Math.round(w * 0.003)));

          // Text styling
          const paddingX = Math.round(w * 0.03);
          let currentY = bannerY + Math.round(bannerHeight * 0.22);

          // Line 1: Verification Badge Header
          const headerSize = Math.max(14, Math.round(w * 0.024));
          ctx.font = `bold ${headerSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillStyle = '#34D399';
          ctx.fillText('✓ VERIFIED DOORSTEP DELIVERY • NATURAL MILK DAIRY', paddingX, currentY);

          // Line 2: Realtime Timestamp (Bright Gold / Yellow-Green)
          currentY += Math.round(bannerHeight * 0.24);
          const timeSize = Math.max(13, Math.round(w * 0.021));
          ctx.font = `bold ${timeSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillStyle = '#FDE047';
          ctx.fillText(`🕒 Time: ${fullTimestamp}`, paddingX, currentY);

          // Line 3: Location / Doorstep Address
          currentY += Math.round(bannerHeight * 0.22);
          const bodySize = Math.max(12, Math.round(w * 0.019));
          ctx.font = `500 ${bodySize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillStyle = '#FFFFFF';
          const locText = address ? `📍 Doorstep: ${address}` : '📍 Doorstep: Hyderabad / Madhapur Hub';
          const truncatedLoc = locText.length > 70 ? locText.slice(0, 67) + '...' : locText;
          ctx.fillText(truncatedLoc, paddingX, currentY);

          // Line 4: Customer & Partner Name
          currentY += Math.round(bannerHeight * 0.20);
          ctx.font = `600 ${Math.max(11, Math.round(w * 0.017))}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillStyle = '#A7F3D0';
          const personText = `👤 Customer: ${customerName}  •  🚚 Partner: ${partnerName}`;
          const truncatedPerson = personText.length > 75 ? personText.slice(0, 72) + '...' : personText;
          ctx.fillText(truncatedPerson, paddingX, currentY);

          // Export as JPEG Blob
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const watermarkedFile = new File([blob], file.name.replace(/\.[^.]+$/, '') + '_verified.jpg', {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(watermarkedFile);
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.88
          );
        } catch (err) {
          console.warn('Canvas watermarking error, falling back to original:', err);
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
