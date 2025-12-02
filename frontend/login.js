// ==================== TOKEN HANDLING FROM URL ====================
// Extract and decode token from URL if redirected from Google OAuth
const urlParams = new URLSearchParams(window.location.search);
const rawToken = urlParams.get('token');
const errorFromUrl = urlParams.get('error');

if (rawToken) {
  const decodedToken = decodeURIComponent(rawToken);
  // Store decoded token under authToken for frontend usage
  localStorage.setItem('authToken', decodedToken);
  // Also keep backward-compatible key if used elsewhere
  localStorage.setItem('jwt', decodedToken);
  // Remove token from URL
  urlParams.delete('token');
  const newUrl = window.location.pathname + (urlParams.toString() ? '?' + urlParams.toString() : '');
  window.history.replaceState({}, '', newUrl);
  // Redirect to index
  window.location.href = 'index.html';
}

// Display URL error if exists (only for OAuth errors, not login failures)
if (errorFromUrl && !errorFromUrl.toLowerCase().includes('incorrect') && !errorFromUrl.toLowerCase().includes('invalid')) {
  showError(errorFromUrl);
}

// ==================== DOM ELEMENTS ====================
const form = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-button');
const buttonText = document.getElementById('button-text');
const buttonLoader = document.getElementById('button-loader');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const statusMessage = document.getElementById('status');
const togglePasswordBtn = document.getElementById('toggle-password');
const eyeIcon = document.getElementById('eye-icon');
const eyeOffIcon = document.getElementById('eye-off-icon');

// ==================== UI HELPER FUNCTIONS ====================
function showError(message) {
  errorText.textContent = message;
  errorMessage.hidden = false;
}

function hideError() {
  errorMessage.hidden = true;
  errorText.textContent = '';
}

function showStatus(message) {
  statusMessage.textContent = message;
  statusMessage.hidden = false;
}

function hideStatus() {
  statusMessage.hidden = true;
  statusMessage.textContent = '';
}

function showSuccess(message) {
  const successBox = document.createElement('div');
  successBox.className = 'success-message';
  successBox.innerHTML = `
    <span class="success-icon">✓</span>
    <span class="success-text">${message}</span>
  `;
  
  // Insert before form
  form.parentElement.insertBefore(successBox, form);
  
  // Auto-remove after animation
  setTimeout(() => {
    successBox.style.opacity = '0';
    successBox.style.transform = 'scale(0.8) translateY(-10px)';
    setTimeout(() => successBox.remove(), 300);
  }, 2000);
}

function setButtonLoading(isLoading) {
  loginButton.disabled = isLoading;
  if (isLoading) {
    buttonText.textContent = 'Logging in...';
    buttonLoader.hidden = false;
  } else {
    buttonText.textContent = 'Log in';
    buttonLoader.hidden = true;
  }
}

// ==================== PASSWORD TOGGLE ====================
if (togglePasswordBtn) {
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    eyeIcon.hidden = !isPassword;
    eyeOffIcon.hidden = isPassword;
  });
}

// ==================== FORM SUBMISSION ====================
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  hideError();
  hideStatus();
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Basic validation
  if (!email || !password) {
    showError('Please enter both email and password.');
    return;
  }

  setButtonLoading(true);

  try {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        token ? { Authorization: 'Bearer ' + token } : {}
      ),
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Store token
    localStorage.setItem('jwt', data.token);
    localStorage.setItem('authToken', data.token);
    
    // Optional: store user info
    localStorage.setItem('userEmail', data.user?.email || email);

    // Show success popup
    showSuccess('Login successful!');
    
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);

  } catch (err) {
    console.error('Login error:', err);
    
    // Format error message
    let errorMsg = err.message || 'Login failed';
    
    if (errorMsg.toLowerCase().includes('incorrect') || 
        errorMsg.toLowerCase().includes('invalid') ||
        errorMsg.toLowerCase().includes('wrong')) {
      errorMsg = 'Incorrect email or password.';
    } else if (errorMsg.toLowerCase().includes('locked') || 
               errorMsg.toLowerCase().includes('too many')) {
      errorMsg = 'Too many failed attempts. Please try again later.';
    } else if (errorMsg.toLowerCase().includes('network') || 
               errorMsg.toLowerCase().includes('fetch')) {
      errorMsg = 'Network error. Please check your connection.';
    }
    
    showError(errorMsg);
  } finally {
    setButtonLoading(false);
  }
});

// ==================== INPUT FOCUS ANIMATIONS ====================
// Clear error when user starts typing
emailInput.addEventListener('input', hideError);
passwordInput.addEventListener('input', hideError);
