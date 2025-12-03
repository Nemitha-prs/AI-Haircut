// Inject token from URL into localStorage on load
(function () {
  const params = new URLSearchParams(window.location.search);
  const rawToken = params.get("token");

  if (rawToken) {
    const decodedToken = decodeURIComponent(rawToken);
    localStorage.setItem("authToken", decodedToken);

    params.delete("token");
    const clean =
      window.location.pathname +
      (params.toString() ? "?" + params.toString() : "");
    window.history.replaceState({}, "", clean);
  }
})();

// DOM Elements
const form = document.getElementById('upload-form');
const statusContainer = document.getElementById('status-container');
const statusMessage = document.getElementById('status-message');
const loadingState = document.getElementById('loading-state');
const resultsPanel = document.getElementById('results');
const shapeEl = document.getElementById('face-shape');
const confidenceEl = document.getElementById('confidence');
const suggestionsEl = document.getElementById('suggestions');
const noSuggestionsEl = document.getElementById('no-suggestions');
const analyzeBtn = document.getElementById('analyze-btn');
const btnText = document.getElementById('btn-text');
const btnLoader = document.getElementById('btn-loader');
const previewImg = document.getElementById('preview');
const previewWrap = document.getElementById('preview-wrap');
const resultsPreview = document.getElementById('results-preview');
const mForehead = document.getElementById('m-forehead');
const mCheek = document.getElementById('m-cheek');
const mJaw = document.getElementById('m-jaw');
const mLength = document.getElementById('m-length');
const genderEl = document.getElementById('gender');
const ageEl = document.getElementById('age');
const ageGroupEl = document.getElementById('age-group');

// Row elements to hide when values are not available
const mRowForehead = document.getElementById('m-row-forehead');
const mRowCheek = document.getElementById('m-row-cheek');
const mRowJaw = document.getElementById('m-row-jaw');
const mRowLength = document.getElementById('m-row-length');
const measurementsWrap = document.getElementById('measurements');
const confidenceRow = document.getElementById('confidence-row');
const ageRow = document.getElementById('age-row');

const API_BASE_URL = 'https://moderate-juliet-nemitha-prs-7cefc1b4.koyeb.app';
const BACKEND_URL = `${API_BASE_URL}/analyze`;
let UPLOAD_CONSTRAINTS = null;

// Global token check
(function(){
  const token = localStorage.getItem('authToken');
  if (!token) {
    console.warn('No token found — user is not logged in');
  }
})();

// Fetch constraints from backend on load
async function fetchConstraints() {
  try {
    const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
    const r = await fetch(`${API_BASE_URL}/api/constraints`, {
      headers: token ? { Authorization: 'Bearer ' + token } : undefined
    });
    if (r.ok) UPLOAD_CONSTRAINTS = await r.json();
  } catch (e) {
    UPLOAD_CONSTRAINTS = null;
  }
}
fetchConstraints();

// Initialize: disable analyze button by default (no file selected yet)
analyzeBtn.disabled = true;

// UI Helper Functions
function showStatus(message, type = 'info') {
  const container = document.getElementById('status-container');
  const messageEl = document.getElementById('status-message');
  
  if (!container || !messageEl) return;
  
  messageEl.textContent = message;
  messageEl.className = type === 'error' ? 'alert-message error' : 'alert-message success';
  container.hidden = false;
  
  // Auto-hide success/info messages after 5 seconds
  if (type !== 'error') {
    setTimeout(() => {
      container.hidden = true;
    }, 5000);
  }
}

function hideStatus() {
  const container = document.getElementById('status-container');
  if (container) container.hidden = true;
}

function showLoading() {
  const loadingState = document.getElementById('loading-state');
  const results = document.getElementById('results');
  if (loadingState) loadingState.hidden = false;
  if (results) results.hidden = true;
  hideStatus();
}

function hideLoading() {
  const loadingState = document.getElementById('loading-state');
  if (loadingState) loadingState.hidden = true;
}

function setButtonLoading(loading) {
  const btn = document.getElementById('analyze-btn');
  const btnText = document.getElementById('btn-text');
  const btnLoader = document.getElementById('btn-loader');
  
  if (!btn || !btnText || !btnLoader) return;
  
  btn.disabled = loading;
  if (loading) {
    btnText.textContent = 'Analyzing...';
    btnLoader.hidden = false;
  } else {
    btnText.textContent = '✨ Analyze My Face Now';
    btnLoader.hidden = true;
  }
}

// Preview selected image immediately
const fileInput = document.getElementById('photo');
let currentFileValid = true;

fileInput.addEventListener('change', async () => {
  const file = fileInput.files && fileInput.files[0];
  currentFileValid = true;
  hideStatus();
  
  // Clear previous results when new file is selected
  resultsPanel.hidden = true;
  previewWrap.hidden = true;
  previewImg.src = '';
  
  if (!file) {
    analyzeBtn.disabled = true;
    return;
  }
  
  // Validate basic constraints (type and file size)
  if (UPLOAD_CONSTRAINTS) {
    if (UPLOAD_CONSTRAINTS.allowedTypes && !UPLOAD_CONSTRAINTS.allowedTypes.includes(file.type)) {
      showStatus('⚠️ Unsupported file type. Please upload JPG or PNG.', 'error');
      currentFileValid = false;
      analyzeBtn.disabled = true;
      return;
    }
    if (UPLOAD_CONSTRAINTS.maxFileSize && file.size > UPLOAD_CONSTRAINTS.maxFileSize) {
      showStatus(`⚠️ File too large. Max ${(UPLOAD_CONSTRAINTS.maxFileSize/1024/1024).toFixed(1)} MB allowed.`, 'error');
      currentFileValid = false;
      analyzeBtn.disabled = true;
      return;
    }
  }
  
  // Load image to check dimensions
  const dataUrl = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  }).catch(() => null);
  
  if (!dataUrl) {
    showStatus('⚠️ Failed to read image file.', 'error');
    currentFileValid = false;
    analyzeBtn.disabled = true;
    return;
  }
  
  const img = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = dataUrl;
  }).catch(() => null);
  
  if (!img) {
    showStatus('⚠️ Failed to load image. Please try another file.', 'error');
    currentFileValid = false;
    analyzeBtn.disabled = true;
    return;
  }
  
  // Validate dimensions
  if (UPLOAD_CONSTRAINTS) {
    if (UPLOAD_CONSTRAINTS.maxWidth && img.width > UPLOAD_CONSTRAINTS.maxWidth) {
      showStatus(`⚠️ Image width too large (max ${UPLOAD_CONSTRAINTS.maxWidth}px). Please choose another image.`, 'error');
      currentFileValid = false;
      analyzeBtn.disabled = true;
      return;
    }
    if (UPLOAD_CONSTRAINTS.maxHeight && img.height > UPLOAD_CONSTRAINTS.maxHeight) {
      showStatus(`⚠️ Image height too large (max ${UPLOAD_CONSTRAINTS.maxHeight}px). Please choose another image.`, 'error');
      currentFileValid = false;
      analyzeBtn.disabled = true;
      return;
    }
    if (UPLOAD_CONSTRAINTS.minWidth && img.width < UPLOAD_CONSTRAINTS.minWidth) {
      showStatus(`⚠️ Image width too small (min ${UPLOAD_CONSTRAINTS.minWidth}px). Please choose another image.`, 'error');
      currentFileValid = false;
      analyzeBtn.disabled = true;
      return;
    }
    if (UPLOAD_CONSTRAINTS.minHeight && img.height < UPLOAD_CONSTRAINTS.minHeight) {
      showStatus(`⚠️ Image height too small (min ${UPLOAD_CONSTRAINTS.minHeight}px). Please choose another image.`, 'error');
      currentFileValid = false;
      analyzeBtn.disabled = true;
      return;
    }
  }
  
  // All validations passed - show preview and enable button
  previewImg.src = dataUrl;
  previewWrap.hidden = false;
  currentFileValid = true;
  analyzeBtn.disabled = false;
  hideStatus();
});

// Ensure clicking the file input resets previous selection and results
fileInput.addEventListener('click', () => {
  fileInput.value = '';
  previewWrap.hidden = true;
  previewImg.src = '';
  resultsPanel.hidden = true;
  hideStatus();
});

// Form submission
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  // Validation already done in fileInput change handler
  if (!currentFileValid || !fileInput.files.length) {
    showStatus('⚠️ Please fix the image issues and select a valid photo.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('photo', fileInput.files[0]);

  setButtonLoading(true);
  showLoading();

  try {
    const token = localStorage.getItem('authToken') || localStorage.getItem('jwt');
    const headers = {
      Authorization: 'Bearer ' + token
    };
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = [errorBody.error, errorBody.detail || errorBody.details].filter(Boolean).join(': ');
      
      // Format error messages for better UX
      let formattedError = message || 'Analysis failed.';
      if (formattedError.includes('No face detected')) {
        formattedError = '⚠️ No face detected\nPlease upload a clear photo with a human face.';
      } else if (formattedError.includes('Multiple faces')) {
        formattedError = '⚠️ Multiple faces detected\nPlease upload a photo with only one face.';
      } else if (formattedError.includes('too low') || formattedError.includes('blurry')) {
        formattedError = '⚠️ Image quality is too low\nPlease upload a clear, high-quality face photo.';
      } else if (formattedError.includes('daily limit') || formattedError.includes('attempts')) {
        formattedError = '⚠️ Daily limit reached\nYou have used all your daily scans. Please try again tomorrow.';
      } else if (formattedError.includes('token') || formattedError.includes('auth')) {
        formattedError = '⚠️ Authentication error\nPlease log in again.';
      } else {
        formattedError = '⚠️ ' + formattedError;
      }
      
      throw new Error(formattedError);
    }

    const data = await response.json();
    console.log('📊 Analysis data received:', data);
    hideLoading();
    renderResults(data);
    
    // Smooth scroll to results
    setTimeout(() => {
      const resultsSection = document.getElementById('results');
      if (resultsSection && !resultsSection.hidden) {
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
    
  } catch (error) {
    console.error('❌ Analysis error:', error);
    hideLoading();
    showStatus(error.message || '⚠️ Something went wrong. Please try again.', 'error');
    const resultsSection = document.getElementById('results');
    if (resultsSection) resultsSection.hidden = true;
  } finally {
    setButtonLoading(false);
  }
});

function renderResults({ faceShape, confidence, suggestions, measurements, raw, gender, age, ageGroup }) {
  console.log('🎨 Rendering results...', { faceShape, gender, age, ageGroup, confidence, suggestionsCount: suggestions?.length });
  
  // Get all elements
  const resultsPanel = document.getElementById('results');
  const shapeEl = document.getElementById('face-shape');
  const genderEl = document.getElementById('gender');
  const ageEl = document.getElementById('age');
  const ageRow = document.getElementById('age-row');
  const ageGroupEl = document.getElementById('age-group');
  const confidenceEl = document.getElementById('confidence');
  const confidenceRow = document.getElementById('confidence-row');
  const resultsPreview = document.getElementById('results-preview');
  const previewImg = document.getElementById('preview');
  const suggestionsEl = document.getElementById('suggestions');
  const noSuggestionsEl = document.getElementById('no-suggestions');
  const measurementsWrap = document.getElementById('measurements');
  const mForehead = document.getElementById('m-forehead');
  const mCheek = document.getElementById('m-cheek');
  const mJaw = document.getElementById('m-jaw');
  const mLength = document.getElementById('m-length');
  const mRowForehead = document.getElementById('m-row-forehead');
  const mRowCheek = document.getElementById('m-row-cheek');
  const mRowJaw = document.getElementById('m-row-jaw');
  const mRowLength = document.getElementById('m-row-length');
  
  if (!resultsPanel) {
    console.error('❌ Results panel not found!');
    return;
  }
  
  // Set basic attributes
  if (shapeEl) shapeEl.textContent = faceShape ?? 'Unknown';
  if (genderEl) genderEl.textContent = gender ?? 'Unknown';
  
  if (typeof age === 'number' && ageEl && ageRow) {
    ageRow.hidden = false;
    ageEl.textContent = String(age);
  } else if (ageRow) {
    ageRow.hidden = true;
  }
  
  if (ageGroupEl) ageGroupEl.textContent = ageGroup ?? 'Unknown';
  
  if (typeof confidence === 'number' && confidenceEl && confidenceRow) {
    confidenceRow.hidden = false;
    confidenceEl.textContent = `${(confidence * 100).toFixed(1)}%`;
  } else if (confidenceRow) {
    confidenceRow.hidden = true;
  }

  // Measurements
  if (measurements?.foreheadWidth && mForehead && mRowForehead) {
    mRowForehead.hidden = false;
    mForehead.textContent = `${measurements.foreheadWidth}px`;
  } else if (mRowForehead) {
    mRowForehead.hidden = true;
  }
  
  if (measurements?.cheekboneWidth && mCheek && mRowCheek) {
    mRowCheek.hidden = false;
    mCheek.textContent = `${measurements.cheekboneWidth}px`;
  } else if (mRowCheek) {
    mRowCheek.hidden = true;
  }
  
  if (measurements?.jawWidth && mJaw && mRowJaw) {
    mRowJaw.hidden = false;
    mJaw.textContent = `${measurements.jawWidth}px`;
  } else if (mRowJaw) {
    mRowJaw.hidden = true;
  }
  
  if (measurements?.faceLength && mLength && mRowLength) {
    mRowLength.hidden = false;
    mLength.textContent = `${measurements.faceLength}px`;
  } else if (mRowLength) {
    mRowLength.hidden = true;
  }

  // Hide the whole measurements block if everything is missing
  const anyMeasurementVisible = measurements && (measurements.foreheadWidth || measurements.cheekboneWidth || measurements.jawWidth || measurements.faceLength);
  if (measurementsWrap) measurementsWrap.hidden = !anyMeasurementVisible;

  // Preview returned image
  if (resultsPreview && previewImg) {
    resultsPreview.src = previewImg.src || '';
  }

  // Render suggestions
  if (suggestionsEl) {
    suggestionsEl.innerHTML = '';
    console.log('🎯 Rendering suggestions:', suggestions?.length || 0);
  }
  
  if (Array.isArray(suggestions) && suggestions.length && suggestionsEl) {
    if (noSuggestionsEl) noSuggestionsEl.hidden = true;
    
    suggestions.forEach((s, idx) => {
      console.log(`  ✂️ Suggestion ${idx + 1}:`, s.name || s);
      const card = document.createElement('div');
      card.className = 'suggestion-card';
      
      const name = typeof s === 'string' ? s : (s.name || 'Suggestion');
      const example = typeof s === 'string' ? null : (s.image || null);
      const description = typeof s === 'object' ? (s.description || '') : '';
      const whyMatches = typeof s === 'object' && Array.isArray(s.why_it_matches) ? s.why_it_matches : [];
      
      // Create image
      const img = document.createElement('img');
      const FALLBACK_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="320"><rect width="100%" height="100%" fill="#e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="Inter, Arial" font-size="18" font-weight="600">Hair Style</text></svg>');
      img.className = 'suggestion-image';
      img.src = example || FALLBACK_SVG;
      img.alt = name;
      img.onerror = () => {
        img.onerror = null;
        img.src = FALLBACK_SVG;
      };
      
      // Create content container
      const content = document.createElement('div');
      content.className = 'suggestion-content';
      
      // Create title
      const title = document.createElement('div');
      title.className = 'suggestion-name';
      title.textContent = name;
      
      content.appendChild(title);
      
      // Add description if available
      if (description) {
        const desc = document.createElement('div');
        desc.className = 'suggestion-description';
        desc.textContent = description;
        content.appendChild(desc);
      }
      
      // Add "why it matches" if available
      if (whyMatches.length > 0) {
        const whyDiv = document.createElement('div');
        whyDiv.className = 'suggestion-tags';
        whyMatches.forEach(reason => {
          const tag = document.createElement('span');
          tag.className = 'tag';
          tag.textContent = reason;
          whyDiv.appendChild(tag);
        });
        content.appendChild(whyDiv);
      }
      
      card.appendChild(img);
      card.appendChild(content);
      suggestionsEl.appendChild(card);
    });
  } else if (noSuggestionsEl) {
    console.log('⚠️ No suggestions to display');
    noSuggestionsEl.hidden = false;
  }

  // Show results panel
  console.log('✅ Showing results panel');
  if (resultsPanel) {
    resultsPanel.hidden = false;
    console.log('✅ Results panel is now visible');
  }
}

