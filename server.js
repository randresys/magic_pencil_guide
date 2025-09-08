const express = require('express');
const cors = require('cors');
const multer = require('multer');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increase limit for base64 images
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/generated', express.static('generated')); // Serve generated images

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Ensure directories exist
['uploads', 'generated'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
});

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Function to encode image to base64
function imageToBase64(filePath) {
  const imageBuffer = fs.readFileSync(filePath);
  return imageBuffer.toString('base64');
}

// Function to save base64 image data to a file
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
    const filePath = path.join('generated', `${filename}${extension}`);
    
    // Convert base64 data to buffer and save
    const imageBuffer = Buffer.from(imageData, 'base64');
    fs.writeFileSync(filePath, imageBuffer);
    
    console.log(`Image saved successfully to ${filePath}`);
    return `/generated/${filename}${extension}`; // Return URL path
  } catch (error) {
    console.error('Error saving image:', error);
    throw error;
  }
}



// Function to generate step image using Gemini models with improved flow for children
async function generateStepImage(stepDescription, referenceImageData, previousStepsImagesData, stepNumber, totalSteps) {
  try {
    // Use gemini-2.5-flash-image-preview for image generation
    const imageGenModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });
    
    // Create a more structured and educational prompt for children
    const imagePrompt = `You are a patient art teacher helping children learn to draw step by step.
    
IMPORTANT INSTRUCTIONS FOR THIS STEP:
- This is STEP ${stepNumber} of ${totalSteps} total steps
- ONLY focus on the specific objective for this step: "${stepDescription}"
- DO NOT add elements from future steps
- MAINTAIN the progress from the previous step
- Keep the drawing in black and white pencil style, no colors
- Show clear progression but don't rush to finish the entire drawing early

Create a black and white pencil drawing that shows ONLY the progress for this specific step. Focus exclusively on "${stepDescription}" and nothing else.`;
    
    console.log(`Generating step ${stepNumber}/${totalSteps} image with prompt:`, imagePrompt.substring(0, 100) + "...");
    
    // Construct the content array with the prompt, reference image, and ONLY the previous step image
    const content = [imagePrompt, { inlineData: referenceImageData }];
    
    // Only use the immediately previous step image (if it exists) to prevent overcomplication
    // This makes each step depend only on the immediately previous one, making clearer progression
    if (previousStepsImagesData.length > 0) {
      // Use only the last (most recent) previous step image
      const previousStepImageData = previousStepsImagesData[previousStepsImagesData.length - 1];
      content.push({ inlineData: previousStepImageData });
    }

    console.log(`Content sent for step ${stepNumber}:`, { prompt: content[0], imageCount: content.length - 1 });

    // Try to generate the step image, providing the reference sketch and previous steps
    const imageResult = await imageGenModel.generateContent(content);
    const imageResponse = await imageResult.response;
    console.log(`Full step ${stepNumber}/${totalSteps} response:`, JSON.stringify(imageResponse, null, 2));
    
    // Check if we got image data in the response
    let imageUrl = null;
    
    if (imageResponse.candidates && imageResponse.candidates.length > 0) {
      const candidate = imageResponse.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of imageResponse.candidates[0].content.parts) {
          if (part.inlineData) {
            console.log(`Found image data for step ${stepNumber} in part.inlineData`);
            try {
              const filename = `step_${stepNumber}_${Date.now()}`;
              const imageUrl = saveGeneratedImage(
                part.inlineData.data,
                part.inlineData.mimeType,
                filename
              );
              console.log(`✓ Step ${stepNumber}/${totalSteps} image generated and saved successfully`);
              return { imageUrl, imageData: part.inlineData }; // Return URL and data
            } catch (saveError) {
              console.error(`Failed to save step ${stepNumber} image:`, saveError);
            }
            break; // Exit loop once image is found and processed
          }
        }
      }
    }
    
    // If we get here, no image was generated or found in the expected structure
    console.log(`No image data received for step ${stepNumber} in the expected structure.`);
    return { imageUrl: null, imageData: null };
  } catch (error) {
    console.error(`Error generating step ${stepNumber} image:`, error.message);
    return null;
  }
}

// Function to analyze uploaded image using Gemini vision model
async function analyzeImage(imagePath) {
  try {
    // Use gemini-1.5-flash for image analysis
    const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const imageBase64 = imageToBase64(imagePath);
    
    // Get image description
    const visionPrompt = "Describe the main subject of this image in detail, focusing on shapes, proportions, and key features.";
    
    const visionResult = await visionModel.generateContent([
      visionPrompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg'
        }
      }
    ]);
    
    const visionResponse = await visionResult.response;
    const imageDescription = visionResponse.text();
    
    return imageDescription;
  } catch (error) {
    console.error('Error analyzing image:', error.message);
    throw error;
  }
}



// Function to generate the text for the next drawing step with improved educational approach for children
async function generateNextStepText(referenceImageData, previousStepsImagesData, currentStepNumber, totalSteps) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are a patient and encouraging art teacher teaching children how to draw step by step.
    
IMPORTANT CONTEXT:
- This is STEP ${currentStepNumber} of ${totalSteps} total steps
- The first image is the COMPLETE reference drawing that shows the final goal
- The subsequent images show the progress made so far
- Children need VERY clear, specific, and simple instructions

TASK:
Analyze the reference image and the progress so far, then provide a VERY specific and simple instruction for this step ONLY.
The instruction should be:
1. Extremely focused on ONE specific aspect (e.g., "Draw the outline of the head", "Add the eyes", "Draw the nose")
2. Written in simple language a child can understand
3. No longer than 1-2 short sentences
4. Very precise about what to draw (e.g., "Draw two circles for the eyes" not "Add facial features")
5. Should NOT mention anything that belongs in future steps

EXAMPLE GOOD INSTRUCTIONS:
- "Draw a circle for the head"
- "Add two small circles for the eyes"
- "Draw a curved line for the smile"

EXAMPLE BAD INSTRUCTIONS:
- "Add facial features" (too vague)
- "Draw the face" (too broad)
- "Complete the drawing" (jumps ahead)

Provide only the specific instruction for this step.`;

    // Construct the content array with the prompt, reference image, and all previous step images
    const content = [prompt, { inlineData: referenceImageData }];
    previousStepsImagesData.forEach(imgData => {
      content.push({ inlineData: imgData });
    });

    console.log(`Generating text for step ${currentStepNumber}/${totalSteps}...`);
    const result = await model.generateContent(content);
    const response = await result.response;
    const nextStepText = response.text();
    
    console.log(`Generated step ${currentStepNumber}/${totalSteps} text:`, nextStepText);
    return nextStepText;

  } catch (error) {
    console.error('Error generating next step text:', error.message);
    // Return a generic instruction if the analysis fails
    return "Draw the next part of your picture.";
  }
}

// Function to generate audio narration
async function generateAudioNarration(text) {
  try {
    // This is a placeholder implementation
    console.log('Generating audio for text:', text.substring(0, 50) + '...');
    return 'audio_placeholder.mp3';
  } catch (error) {
    console.error('Error generating audio:', error);
    throw error;
  }
}

// Function to generate a pencil sketch from an uploaded image with strict black and white pencil style
async function generatePencilSketchFromImage(imagePath, difficulty) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });

    const imageBase64 = imageToBase64(imagePath);

    let detailPrompt = '';
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        detailPrompt = 'as a very simple black and white pencil sketch, with only the most basic outlines and minimal detail. CRITICALLY IMPORTANT: Use ONLY black and white, NO COLORS WHATSOEVER. Style: pencil drawing.';
        break;
      case 'intermediate':
        detailPrompt = 'as a moderately detailed black and white pencil sketch, with clear lines and some shading. CRITICALLY IMPORTANT: Use ONLY black and white, NO COLORS WHATSOEVER. Style: pencil drawing.';
        break;
      case 'advanced':
        detailPrompt = 'as a highly detailed black and white pencil sketch, with intricate lines, shading, and texture. CRITICALLY IMPORTANT: Use ONLY black and white, NO COLORS WHATSOEVER. Style: pencil drawing.';
        break;
      default:
        detailPrompt = 'as a black and white pencil sketch. CRITICALLY IMPORTANT: Use ONLY black and white, NO COLORS WHATSOEVER. Style: pencil drawing.';
    }

    const prompt = `Convert the uploaded image into ${detailPrompt} Ensure the result is appropriate for children learning to draw and maintains a clear, educational style.`;

    console.log("Generating reference sketch from image with strict pencil style...");
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: 'image/jpeg' // Assuming jpeg, might need to be dynamic
        }
      }
    ]);
    const response = await result.response;

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const filename = `reference_sketch_${Date.now()}`;
        const imageUrl = saveGeneratedImage(
          part.inlineData.data,
          part.inlineData.mimeType,
          filename
        );
        console.log("✓ Reference sketch generated successfully with strict pencil style");
        return { imageUrl, imageData: part.inlineData }; // Return URL and data for later use
      }
    }
    console.log("No image data received from model for reference sketch.");
    return { imageUrl: null, imageData: null };
  } catch (error) {
    console.error('Error generating pencil sketch from image:', error.message);
    return { imageUrl: null, imageData: null };
  }
}

// Function to determine the optimal number of steps based on image complexity
async function determineOptimalSteps(referenceImageData, imageDescription) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Analyze this image and its description to determine the optimal number of steps for a children's drawing tutorial.
    
Consider:
    - Image complexity (simple shapes, moderate detail, complex details)
    - Number of distinct elements that need to be drawn separately
    - Logical progression for children learning to draw
    
Respond with JUST a number between 8 and 20 representing the optimal number of steps.
    - Simple images (basic shapes, few elements): 8-12 steps
    - Moderate images (several elements, some detail): 12-16 steps
    - Complex images (many elements, lots of detail): 16-20 steps
    
Image Description: ${imageDescription}

Return ONLY the number of steps as a single integer.`;

    const content = [prompt, { inlineData: referenceImageData }];
    const result = await model.generateContent(content);
    const response = await result.response;
    const stepsText = response.text();
    
    // Extract the number from the response
    const stepsNumber = parseInt(stepsText.trim());
    
    // Ensure the number is within reasonable bounds
    if (isNaN(stepsNumber) || stepsNumber < 8 || stepsNumber > 20) {
      console.log("Could not determine optimal steps, using default of 12");
      return 12;
    }
    
    console.log(`Determined optimal number of steps: ${stepsNumber}`);
    return stepsNumber;
  } catch (error) {
    console.error('Error determining optimal steps:', error.message);
    return 12; // Default fallback
  }
}

// Function to generate a structured plan for the drawing tutorial
async function generateTutorialPlan(referenceImageData, imageDescription, totalSteps) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Create a structured plan for teaching children to draw this image in ${totalSteps} steps.
    
For each step, provide:
1. A very specific objective (1-2 short sentences, very clear)
2. What elements to focus on in this step
3. What to avoid (don't jump ahead to future elements)

Format your response as a numbered list with exactly ${totalSteps} steps, like:
1. [Specific objective for step 1]
2. [Specific objective for step 2]
...
${totalSteps}. [Specific objective for step ${totalSteps}]

Image Description: ${imageDescription}`;

    const content = [prompt, { inlineData: referenceImageData }];
    const result = await model.generateContent(content);
    const response = await result.response;
    const planText = response.text();
    
    // Parse the plan into individual steps
    const planSteps = [];
    const lines = planText.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.match(/^\d+\./)) {
        // This is a step line
        const stepText = trimmedLine.replace(/^\d+\.\s*/, '').trim();
        if (stepText) {
          planSteps.push(stepText);
        }
      }
    }
    
    // Ensure we have the right number of steps
    while (planSteps.length < totalSteps) {
      planSteps.push("Continue adding details to your drawing.");
    }
    
    // Limit to the exact number needed
    return planSteps.slice(0, totalSteps);
  } catch (error) {
    console.error('Error generating tutorial plan:', error.message);
    // Return a generic plan if analysis fails
    const genericSteps = [];
    for (let i = 0; i < totalSteps; i++) {
      genericSteps.push(`Work on part ${i + 1} of your drawing.`);
    }
    return genericSteps;
  }
}

// API endpoint to process image and generate tutorial with adaptive step approach
app.post('/api/generate-tutorial', upload.single('image'), async (req, res) => {
  try {
    const { difficulty } = req.body;
    
    // Validate input
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    if (!difficulty) {
      return res.status(400).json({ error: 'Difficulty level is required' });
    }
    
    console.log(`Generating adaptive tutorial for ${difficulty} level`);
    
    // Step 1: Generate a pencil sketch from the uploaded image to use as a reference
    console.log("Generating reference sketch from uploaded image...");
    const { imageUrl: referenceSketchUrl, imageData: referenceSketchData } = await generatePencilSketchFromImage(req.file.path, difficulty);
    if (!referenceSketchUrl) {
      throw new Error("Failed to generate the reference pencil sketch.");
    }
    console.log("Reference sketch generation complete.");

    // Step 2: Analyze the uploaded image to get a text description
    console.log("Analyzing uploaded image...");
    const imageDescription = await analyzeImage(req.file.path);
    console.log("Image analysis complete");
    
    // Step 3: Determine optimal number of steps based on image complexity
    console.log("Determining optimal number of steps...");
    const totalSteps = await determineOptimalSteps(referenceSketchData, imageDescription);
    console.log(`Will generate tutorial with ${totalSteps} steps`);
    
    // Step 4: Generate a structured plan for the tutorial
    console.log("Generating tutorial plan...");
    const tutorialPlan = await generateTutorialPlan(referenceSketchData, imageDescription, totalSteps);
    console.log("Tutorial plan generated");
    
    // Step 5: Initialize arrays to hold the tutorial steps and image data
    const steps = [];
    const previousStepsImagesData = [];

    // Step 6: Generate each step according to the plan
    for (let i = 0; i < totalSteps; i++) {
      const currentStepNumber = i + 1;
      console.log(`--- Generating Step ${currentStepNumber}/${totalSteps} ---`);

      // Use the specific objective from our plan
      const stepDescription = tutorialPlan[i] || `Work on part ${currentStepNumber} of your drawing.`;
      
      console.log(`Step ${currentStepNumber} objective: ${stepDescription}`);

      // Generate the image for the current step with strict step-by-step approach
      const { imageUrl, imageData } = await generateStepImage(
        stepDescription, 
        referenceSketchData, 
        previousStepsImagesData, 
        currentStepNumber,
        totalSteps
      );

      // Add the new step to our steps array
      steps.push({
        step: currentStepNumber,
        description: stepDescription,
        imageUrl: imageUrl,
        audio: null // Audio will be generated later
      });

      // Add the new image data to our collection for the next iteration
      if (imageData) {
        previousStepsImagesData.push(imageData);
        
        // Keep only the most recent images to prevent accumulation
        if (previousStepsImagesData.length > 2) {
          previousStepsImagesData.shift(); // Remove the oldest image
        }
      }
    }
    console.log("All adaptive steps generated.");
    
    // Step 7: Generate audio for sketch description
    const sketchAudio = await generateAudioNarration(imageDescription);
    
    // Step 8: Generate audio for each step
    for (let i = 0; i < steps.length; i++) {
      steps[i].audio = await generateAudioNarration(steps[i].description);
    }
    
    // Return tutorial data
    res.json({
      sketch: {
        imageUrl: referenceSketchUrl, // Use the new reference sketch
        description: imageDescription,
        audio: sketchAudio
      },
      steps: steps
    });
  } catch (error) {
    console.error('Error generating tutorial:', error);
    res.status(500).json({ error: 'Failed to generate tutorial', details: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Drawing tutorial API is running' });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});