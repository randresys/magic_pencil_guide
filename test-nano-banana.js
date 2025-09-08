const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function testNanoBanana() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  try {
    console.log("Testing Gemini Nano (nano-banana) for image generation...");
    
    // According to the documentation, image generation uses a specific method
    // Let's try to initialize the model properly
    
    // Try different model names that might be available for image generation
    const modelNames = [
      "gemini-nano", // Possible name for nano-banana
      "gemini-1.5-flash", // Has image generation capabilities
      "gemini-1.5-pro" // Also has image generation capabilities
    ];
    
    for (const modelName of modelNames) {
      try {
        console.log(`\nTrying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // Test text generation first to verify the model works
        const textPrompt = "Describe how to draw a simple house";
        const textResult = await model.generateContent(textPrompt);
        const textResponse = await textResult.response;
        console.log(`✓ Text generation works with ${modelName}`);
        console.log(`  Sample: ${textResponse.text().substring(0, 100)}...`);
        
        // Try image generation prompt
        const imagePrompt = "Generate a pencil sketch of a simple house";
        console.log(`  Trying image generation with prompt: ${imagePrompt}`);
        
        // This is the key part for image generation according to documentation
        const imageResult = await model.generateContent(imagePrompt);
        const imageResponse = await imageResult.response;
        
        // Check if we got image data in the response
        if (imageResponse.candidates && imageResponse.candidates.length > 0) {
          const candidate = imageResponse.candidates[0];
          if (candidate.content && candidate.content.parts) {
            for (const part of candidate.content.parts) {
              if (part.inlineData) {
                console.log(`✓ Image generated successfully with ${modelName}!`);
                console.log(`  Image type: ${part.inlineData.mimeType}`);
                console.log(`  Image data length: ${part.inlineData.data.length} characters`);
                return; // Success, exit the function
              }
            }
          }
        }
        
        console.log(`  No image data found in response from ${modelName}`);
      } catch (modelError) {
        console.log(`  ✗ ${modelName} not accessible: ${modelError.message.substring(0, 100)}...`);
      }
    }
    
    console.log("\nNone of the models worked for image generation.");
    console.log("This could be due to:");
    console.log("1. Image generation not enabled for your API key");
    console.log("2. The specific model not being available in your region");
    console.log("3. Needing special access for image generation models");
    
  } catch (error) {
    console.error("Error testing models:", error);
  }
}

// Also test the specific image generation method from documentation
async function testImageGenerationMethod() {
  try {
    console.log("\n--- Testing Image Generation Method ---");
    
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // Example from documentation - generate image from text prompt
    const prompt = "Create a pencil sketch of a cat sitting on a windowsill";
    
    console.log("Sending image generation request...");
    console.log("Prompt:", prompt);
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // Process the response to find image data
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (let i = 0; i < candidate.content.parts.length; i++) {
          const part = candidate.content.parts[i];
          if (part.inlineData) {
            console.log("✓ Found image data in response!");
            console.log("  MIME Type:", part.inlineData.mimeType);
            console.log("  Data length:", part.inlineData.data.length, "characters");
            
            // In a real implementation, you would save this data as an image:
            // const imageBuffer = Buffer.from(part.inlineData.data, 'base64');
            // fs.writeFileSync('generated_image.png', imageBuffer, 'base64');
            
            return true;
          }
        }
      }
    }
    
    console.log("No image data found in response");
    console.log("Response structure:", JSON.stringify(response, null, 2));
    return false;
    
  } catch (error) {
    console.log("Error in image generation method:", error.message);
    return false;
  }
}

async function main() {
  await testNanoBanana();
  await testImageGenerationMethod();
}

main().catch(console.error);