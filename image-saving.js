// This file demonstrates how to save generated images to the file system
// It's not meant to be executed directly but shows the implementation approach

const fs = require('fs');
const path = require('path');

/**
 * Function to save base64 image data to a file
 * @param {string} imageData - Base64 encoded image data
 * @param {string} mimeType - MIME type of the image (e.g., "image/png")
 * @param {string} filename - Desired filename without extension
 * @returns {string} Path to the saved image file
 */
function saveGeneratedImage(imageData, mimeType, filename) {
  try {
    // Determine file extension based on MIME type
    let extension = '';
    switch (mimeType) {
      case 'image/png':
        extension = '.png';
        break;
      case 'image/jpeg':
      case 'image/jpg':
        extension = '.jpg';
        break;
      case 'image/gif':
        extension = '.gif';
        break;
      default:
        extension = '.png'; // Default to PNG
    }
    
    // Create file path
    const filePath = path.join('generated_images', `${filename}${extension}`);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Convert base64 data to buffer and save
    const imageBuffer = Buffer.from(imageData, 'base64');
    fs.writeFileSync(filePath, imageBuffer);
    
    console.log(`Image saved successfully to ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
}

/**
 * Example of how to integrate image saving in the main application flow
 */
async function exampleImageSaving() {
  // This is pseudocode showing where image saving would be integrated
  
  // After generating sketch image:
  // const sketchData = await generateSketchImage(req.file.path, difficulty);
  
  // If we have image data, save it:
  // if (sketchData.sketchImage) {
  //   try {
  //     const savedImagePath = saveGeneratedImage(
  //       sketchData.sketchImage.data,
  //       sketchData.sketchImage.mimeType,
  //       `sketch_${Date.now()}`
  //     );
  //     
  //     // Update the response to include the file path
  //     sketchData.imagePath = savedImagePath;
  //   } catch (saveError) {
  //     console.error('Failed to save sketch image:', saveError);
  //     // Continue with just the description if saving fails
  //   }
  // }
}

module.exports = { saveGeneratedImage };