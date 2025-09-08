// DOM Elements
const uploadForm = document.getElementById('upload-form');
const uploadSection = document.getElementById('upload-section');
const tutorialSection = document.getElementById('tutorial-section');
const loadingElement = document.getElementById('loading');
const generateBtn = document.getElementById('generate-btn');

// Tutorial Elements
const sketchDescription = document.getElementById('sketch-description');
const stepTitle = document.getElementById('step-title');
const stepDescription = document.getElementById('step-description');
const stepIndicator = document.getElementById('step-indicator');
const prevStepBtn = document.getElementById('prev-step');
const nextStepBtn = document.getElementById('next-step');
const newTutorialBtn = document.getElementById('new-tutorial-btn');



// Image placeholders
const sketchImagePlaceholder = document.querySelector('#sketch-preview .image-placeholder');
const stepImagePlaceholder = document.querySelector('#current-step .image-placeholder');

// Tutorial Data
let tutorialData = null;
let currentStepIndex = 0;

// Event Listeners
uploadForm.addEventListener('submit', handleFormSubmit);
prevStepBtn.addEventListener('click', showPrevStep);
nextStepBtn.addEventListener('click', showNextStep);
newTutorialBtn.addEventListener('click', resetTutorial);


// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData();
    const imageFile = document.getElementById('image').files[0];
    const difficulty = document.getElementById('difficulty').value;
    
    if (!imageFile) {
        alert('Please select an image');
        return;
    }
    
    if (!difficulty) {
        alert('Please select a difficulty level');
        return;
    }
    
    formData.append('image', imageFile);
    formData.append('difficulty', difficulty);
    
    // Show loading state
    uploadSection.classList.add('hidden');
    loadingElement.classList.remove('hidden');
    generateBtn.disabled = true;
    
    try {
        // Send request to backend
        const response = await fetch('/api/generate-tutorial', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        
        tutorialData = await response.json();
        
        // Show tutorial section
        loadingElement.classList.add('hidden');
        tutorialSection.classList.remove('hidden');
        
        // Initialize tutorial
        initializeTutorial();
    } catch (error) {
        console.error('Error generating tutorial:', error);
        alert(`Error generating tutorial: ${error.message}`);
        
        // Reset UI
        loadingElement.classList.add('hidden');
        uploadSection.classList.remove('hidden');
        generateBtn.disabled = false;
    }
}

// Initialize tutorial
function initializeTutorial() {
    if (!tutorialData) return;
    
    // Display sketch information
    sketchDescription.textContent = tutorialData.sketch.description;
    
    // Display sketch image if available
    if (tutorialData.sketch.imageUrl) {
        // Clear the placeholder and show the image
        sketchImagePlaceholder.innerHTML = '';
        const img = document.createElement('img');
        img.src = tutorialData.sketch.imageUrl;
        img.alt = 'Generated sketch';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '300px';
        img.style.borderRadius = '10px';
        sketchImagePlaceholder.appendChild(img);
    } else {
        // If no image, show a message
        sketchImagePlaceholder.innerHTML = '<p>Sketch image not available. Showing description only.</p>';
    }
    
    // Reset step navigation
    currentStepIndex = 0;
    updateStepDisplay();
    updateNavigationButtons();
}

// Update step display
function updateStepDisplay() {
    if (!tutorialData || !tutorialData.steps || tutorialData.steps.length === 0) return;
    
    const step = tutorialData.steps[currentStepIndex];
    
    // Update UI
    stepTitle.textContent = `Step ${step.step}`;
    stepDescription.textContent = step.description;
    
    // Add tips if available
    // Remove any existing tips first
    const existingTips = stepDescription.parentNode.querySelector('.tips');
    if (existingTips) {
        existingTips.remove();
    }
    
    if (step.tips) {
        const tipsElement = document.createElement('p');
        tipsElement.innerHTML = `<strong>Tip:</strong> ${step.tips}`;
        tipsElement.style.marginTop = '15px';
        tipsElement.style.padding = '10px';
        tipsElement.style.backgroundColor = '#e8f4fd';
        tipsElement.style.borderRadius = '5px';
        tipsElement.classList.add('tips');
        stepDescription.parentNode.insertBefore(tipsElement, playStepAudioBtn);
    }
    
    stepIndicator.textContent = `Step ${step.step} of ${tutorialData.steps.length}`;
    
    // Display step image if available
    if (step.imageUrl) {
        // Clear the placeholder and show the image
        stepImagePlaceholder.innerHTML = '';
        const img = document.createElement('img');
        img.src = step.imageUrl;
        img.alt = `Step ${step.step} illustration`;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '300px';
        img.style.borderRadius = '10px';
        stepImagePlaceholder.appendChild(img);
    } else {
        // If no image, show a message
        stepImagePlaceholder.innerHTML = '<p>Step illustration not available. Showing description only.</p>';
    }
}

// Update navigation buttons
function updateNavigationButtons() {
    if (!tutorialData || !tutorialData.steps) return;
    
    // Previous button
    if (currentStepIndex > 0) {
        prevStepBtn.disabled = false;
    } else {
        prevStepBtn.disabled = true;
    }
    
    // Next button
    if (currentStepIndex < tutorialData.steps.length - 1) {
        nextStepBtn.disabled = false;
    } else {
        nextStepBtn.disabled = true;
    }
}

// Show previous step
function showPrevStep() {
    if (currentStepIndex > 0) {
        currentStepIndex--;
        updateStepDisplay();
        updateNavigationButtons();
    }
}

// Show next step
function showNextStep() {
    if (tutorialData && tutorialData.steps && currentStepIndex < tutorialData.steps.length - 1) {
        currentStepIndex++;
        updateStepDisplay();
        updateNavigationButtons();
    }
}

// Reset tutorial
function resetTutorial() {
    // Reset UI
    tutorialSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    generateBtn.disabled = false;
    
    // Reset data
    tutorialData = null;
    currentStepIndex = 0;
    
    // Remove any tips that might have been added
    const tipsElements = document.querySelectorAll('.tips');
    tipsElements.forEach(el => el.remove());
    
    // Reset image placeholders
    sketchImagePlaceholder.innerHTML = '<p>Reference sketch will appear here</p>';
    stepImagePlaceholder.innerHTML = '<p>Drawing step will appear here</p>';
}



// Check API health on page load
window.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/health');
        if (response.ok) {
            console.log('API is healthy');
        } else {
            console.warn('API health check failed');
        }
    } catch (error) {
        console.warn('Could not connect to API:', error);
    }
});