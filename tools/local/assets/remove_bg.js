import { Jimp } from 'jimp';

async function removeBackground() {
  try {
    console.log("Loading image...");
    const image = await Jimp.read('public/star.jpg');
    
    // Get color at top-left corner
    const bgPixel = image.getPixelColor(0, 0);
    const bgColor = {
      r: (bgPixel >>> 24) & 0xFF,
      g: (bgPixel >>> 16) & 0xFF,
      b: (bgPixel >>> 8) & 0xFF
    };
    console.log("Background color:", bgColor);
    
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // Calculate distance
      const diff = Math.sqrt(
        Math.pow(r - bgColor.r, 2) +
        Math.pow(g - bgColor.g, 2) +
        Math.pow(b - bgColor.b, 2)
      );
      
      // If color is close to background, make transparent
      if (diff < 60) { // Tolerance
        this.bitmap.data[idx + 3] = 0; // Alpha
      }
    });
    
    await image.write('public/star-gamified.png');
    console.log('Done!');
  } catch (e) {
    console.error(e);
  }
}

removeBackground();
