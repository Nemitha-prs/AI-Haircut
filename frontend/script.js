const form = document.getElementById('upload-form');
const statusMessage = document.getElementById('status-message');
const resultsPanel = document.getElementById('results');
const shapeEl = document.getElementById('face-shape');
const confidenceEl = document.getElementById('confidence');
const suggestionsEl = document.getElementById('suggestions');
const analyzeBtn = document.getElementById('analyze-btn');
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
const confidenceRow = confidenceEl.parentElement;

const BACKEND_URL = 'http://localhost:3000/analyze';
let UPLOAD_CONSTRAINTS = null;

// Fetch constraints from backend on load
async function fetchConstraints() {
  try {
    const r = await fetch('http://localhost:3000/api/constraints');
    if (r.ok) UPLOAD_CONSTRAINTS = await r.json();
  } catch (e) {
    UPLOAD_CONSTRAINTS = null;
  }
}
fetchConstraints();

// Initialize: disable analyze button by default (no file selected yet)
analyzeBtn.disabled = true;

// Preview selected image immediately
const fileInput = document.getElementById('photo');
let currentFileValid = true; // whether the selected file passes initial type/size checks
fileInput.addEventListener('change', async () => {
  const file = fileInput.files && fileInput.files[0];
  currentFileValid = true;
  statusMessage.textContent = '';
  
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
      statusMessage.textContent = 'Unsupported file type. Please upload JPG or PNG.';
      currentFileValid = false;
      analyzeBtn.disabled = true;
      return;
    }
    if (UPLOAD_CONSTRAINTS.maxFileSize && file.size > UPLOAD_CONSTRAINTS.maxFileSize) {
      statusMessage.textContent = `File too large. Max ${(UPLOAD_CONSTRAINTS.maxFileSize/1024/1024).toFixed(1)} MB allowed.`;
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
    statusMessage.textContent = 'Failed to read image file.';
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
    statusMessage.textContent = 'Failed to load image. Please try another file.';
    currentFileValid = false;
    analyzeBtn.disabled = true;
    return;
  }
  
  // Validate dimensions
  if (UPLOAD_CONSTRAINTS) {
    if (UPLOAD_CONSTRAINTS.maxWidth && img.width > UPLOAD_CONSTRAINTS.maxWidth) {
      statusMessage.textContent = `Image width too large (max ${UPLOAD_CONSTRAINTS.maxWidth}px). Please choose another image.`;
      currentFileValid = false;
      analyzeBtn.disabled = true;
      return;
    }
    if (UPLOAD_CONSTRAINTS.maxHeight && img.height > UPLOAD_CONSTRAINTS.maxHeight) {
      statusMessage.textContent = `Image height too large (max ${UPLOAD_CONSTRAINTS.maxHeight}px). Please choose another image.`;
      currentFileValid = false;
      analyzeBtn.disabled = true;
      return;
    }
    if (UPLOAD_CONSTRAINTS.minWidth && img.width < UPLOAD_CONSTRAINTS.minWidth) {
      statusMessage.textContent = `Image width too small (min ${UPLOAD_CONSTRAINTS.minWidth}px). Please choose another image.`;
      currentFileValid = false;
      analyzeBtn.disabled = true;
      return;
    }
    if (UPLOAD_CONSTRAINTS.minHeight && img.height < UPLOAD_CONSTRAINTS.minHeight) {
      statusMessage.textContent = `Image height too small (min ${UPLOAD_CONSTRAINTS.minHeight}px). Please choose another image.`;
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
  statusMessage.textContent = '';
});

// Ensure clicking the file input resets previous selection and results so user starts fresh
fileInput.addEventListener('click', () => {
  // Clear value so selecting same file again triggers change
  fileInput.value = '';
  previewWrap.hidden = true;
  previewImg.src = '';
  resultsPanel.hidden = true;
  statusMessage.textContent = '';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  // Validation already done in fileInput change handler
  if (!currentFileValid || !fileInput.files.length) {
    statusMessage.textContent = 'Please fix the image issues and select a valid photo.';
    return;
  }

  const formData = new FormData();
  formData.append('photo', fileInput.files[0]);

  setLoading(true);
  statusMessage.textContent = 'Analyzing photo...';

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = [errorBody.error, errorBody.detail || errorBody.details].filter(Boolean).join(': ');
      throw new Error(message || 'Analysis failed.');
    }

    const data = await response.json();
    renderResults(data);
    statusMessage.textContent = 'Done! Scroll to see your recommendation.';
  } catch (error) {
    console.error(error);
    statusMessage.textContent = error.message || 'Something went wrong.';
    resultsPanel.hidden = true;
  } finally {
    setLoading(false);
  }
});

function renderResults({ faceShape, confidence, suggestions, measurements, raw, gender, age, ageGroup }) {
  shapeEl.textContent = faceShape ?? 'unknown';
  genderEl.textContent = gender ?? 'unknown';
  ageEl.textContent = (typeof age === 'number') ? String(age) : 'unknown';
  ageGroupEl.textContent = ageGroup ?? 'unknown';
  confidenceEl.textContent = typeof confidence === 'number' ? `${(confidence * 100).toFixed(1)}%` : 'n/a';

  // Measurements
  mForehead.textContent = measurements?.foreheadWidth ? `${measurements.foreheadWidth}px` : 'n/a';
  mCheek.textContent = measurements?.cheekboneWidth ? `${measurements.cheekboneWidth}px` : 'n/a';
  mJaw.textContent = measurements?.jawWidth ? `${measurements.jawWidth}px` : 'n/a';
  mLength.textContent = measurements?.faceLength ? `${measurements.faceLength}px` : 'n/a';

  // Preview returned raw image if available (we'll reuse the selected preview)
  resultsPreview.src = previewImg.src || '';

  suggestionsEl.innerHTML = '';
    if (Array.isArray(suggestions) && suggestions.length) {
    suggestions.forEach((s) => {
      const card = document.createElement('div');
      card.className = 'suggestion-card';
      const img = document.createElement('img');
      // Use provided example image; fallback to inline SVG if loading fails
      const FALLBACK_SVG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="Segoe UI, Arial" font-size="20">Example</text></svg>');
      const name = typeof s === 'string' ? s : (s.name || 'Suggestion');
      const example = typeof s === 'string' ? null : (s.image || null);
      img.src = example || FALLBACK_SVG;
      img.alt = name;
      img.onerror = () => {
        img.onerror = null;
        img.src = FALLBACK_SVG;
      };
      const title = document.createElement('div');
      title.className = 'suggestion-title';
      title.textContent = name;
      card.appendChild(img);
      card.appendChild(title);
      suggestionsEl.appendChild(card);
    });
  } else {
    const li = document.createElement('div');
    li.textContent = 'No suggestions available.';
    suggestionsEl.appendChild(li);
  }

  // Hide measurement rows where data is missing
  if (measurements?.foreheadWidth) {
    mRowForehead.style.display = '';
    mForehead.textContent = `${measurements.foreheadWidth}px`;
  } else {
    mRowForehead.style.display = 'none';
  }
  if (measurements?.cheekboneWidth) {
    mRowCheek.style.display = '';
    mCheek.textContent = `${measurements.cheekboneWidth}px`;
  } else {
    mRowCheek.style.display = 'none';
  }
  if (measurements?.jawWidth) {
    mRowJaw.style.display = '';
    mJaw.textContent = `${measurements.jawWidth}px`;
  } else {
    mRowJaw.style.display = 'none';
  }
  if (measurements?.faceLength) {
    mRowLength.style.display = '';
    mLength.textContent = `${measurements.faceLength}px`;
  } else {
    mRowLength.style.display = 'none';
  }

  // Hide the whole measurements block if everything is missing
  const anyMeasurementVisible = [mRowForehead, mRowCheek, mRowJaw, mRowLength].some(r => r.style.display !== 'none');
  measurementsWrap.style.display = anyMeasurementVisible ? '' : 'none';

  // Confidence row: hide if no numeric confidence
  if (typeof confidence === 'number') {
    confidenceRow.style.display = '';
    confidenceEl.textContent = `${(confidence * 100).toFixed(1)}%`;
  } else {
    confidenceRow.style.display = 'none';
  }

  resultsPanel.hidden = false;
}

function setLoading(isLoading) {
  analyzeBtn.disabled = isLoading;
  analyzeBtn.textContent = isLoading ? 'Analyzing...' : 'Analyze';
}

