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
  // Wait for DOM to be ready to show error
  document.addEventListener('DOMContentLoaded', () => showError(errorFromUrl));
}

// ==================== DOM ELEMENTS & INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const loginButton = document.getElementById('login-button');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const statusMessage = document.getElementById('status');
  
  // Password Toggle Elements
  const togglePasswordBtn = document.getElementById('toggle-password');
  const passwordIcon = document.getElementById('password-icon');

  // ==================== PASSWORD TOGGLE LOGIC ====================
  if (togglePasswordBtn && passwordInput && passwordIcon) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      
      // Toggle Input Type
      passwordInput.type = isPassword ? 'text' : 'password';
      
      // Toggle Icon Path (Single Icon Element)
      // Eye Off (Hidden) -> Eye (Show)
      if (isPassword) {
        // Switch to "Eye" (meaning: click to show/currently visible? No, we just switched to text)
        // If isPassword was true, we switched to text. So now it is visible.
        // Show "Eye" icon to represent "Visible" or "Click to Hide"? 
        // User said: "The initial state must ALWAYS show the 'hidden' icon first."
        // So if we are now visible (text), we should show the "Eye" icon (Open).
        passwordIcon.innerHTML = `
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        `;
      } else {
        // Switch back to "Eye Off" (Hidden)
        passwordIcon.innerHTML = `
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
          <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
      }
    });
  }

  // ==================== UI HELPER FUNCTIONS ====================
  function showError(message) {
    if (errorText && errorMessage) {
      errorText.textContent = message;
      errorMessage.hidden = false;
    }
  }

  function hideError() {
    if (errorMessage && errorText) {
      errorMessage.hidden = true;
      errorText.textContent = '';
    }
  }

  function showStatus(message) {
    if (statusMessage) {
      statusMessage.textContent = message;
      statusMessage.hidden = false;
    }
  }

  function hideStatus() {
    if (statusMessage) {
      statusMessage.hidden = true;
      statusMessage.textContent = '';
    }
  }

  function showSuccess(message) {
    const successBox = document.createElement('div');
    successBox.className = 'success-message';
    successBox.innerHTML = `
      <span class="success-icon">✓</span>
      <span class="success-text">${message}</span>
    `;
    
    // Insert before form
    if (form && form.parentElement) {
      form.parentElement.insertBefore(successBox, form);
    }
    
    // Auto-remove after animation
    setTimeout(() => {
      successBox.style.opacity = '0';
      successBox.style.transform = 'scale(0.8) translateY(-10px)';
      setTimeout(() => successBox.remove(), 300);
    }, 2000);
  }

  function setButtonLoading(isLoading) {
    if (!loginButton) return;
    loginButton.disabled = isLoading;
    if (isLoading) {
      loginButton.classList.add('loading');
    } else {
      loginButton.classList.remove('loading');
    }
  }

  // ==================== FORM SUBMISSION ====================
  if (form) {
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
        const response = await fetch('https://moderate-juliet-nemitha-prs-7cefc1b4.koyeb.app/auth/login', {
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
  }

  // ==================== INPUT FOCUS ANIMATIONS ====================
  if (emailInput) emailInput.addEventListener('input', hideError);
  if (passwordInput) passwordInput.addEventListener('input', hideError);

  // ==================== BACKGROUND IMAGE GRID ====================
  const backgroundContainer = document.querySelector('.background-container');
  
  if (backgroundContainer) {
    const images = [
      'photos/0724aa014349187d6f3eb5804165a6cc.jpg',
      'photos/0d2a195ab157404f7a7af1bc34ad37cb.jpg',
      'photos/280f9d53291c55ad45ee867739683224.jpg',
      'photos/2861a5738dd327b3a3efb9b0d914c35e.jpg',
      'photos/2ca3897b0ab2e46c98e8bf069bee8cb6.jpg',
      'photos/583899899aa6da0664d9af52b105ed75.jpg',
      'photos/5d58d18711f67090ddffc9f4e83f0600.jpg',
      'photos/65b51e22d6adaeecfe5aef2cf05e85aa.jpg',
      'photos/85d92c4387ae6f211a488a8283b71bab.jpg',
      'photos/a4c02d2ecc9175b47ea91d64b79e74c5.jpg',
      'photos/c401968ab38c2e3842b9a101c20b71bb.jpg',
      'photos/c65841f8c3fe72838a5ba9779bb7a50a.jpg',
      'photos/fb911db59293048b2c49d2be8e39fc20.jpg',
      'photos/Fresh & Trendy_ New Haircuts for Men 2025 - 22 Ideas for Short, Curly, and Long Styles.jpeg',
      'photos/images.jpeg',
      'photos/pexels-photo-2379005.jpeg',
      'photos/pexels-pixabay-415829.jpg'
    ];

    // Create a larger array of images to fill the grid
    // We want enough to fill a large screen. 
    // Grid items are min 200px. 1920x1080 screen -> ~10 cols x 6 rows = 60 items.
    const totalItems = 80; 
    const imagePool = [];
    
    // Shuffle function (Fisher-Yates)
    function shuffle(array) {
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
    }

    // Fill pool using "Deck Shuffle" method to ensure no repeats until all images are used
    let currentDeck = [];
    
    for (let i = 0; i < totalItems; i++) {
      if (currentDeck.length === 0) {
        // Refill and shuffle deck
        currentDeck = [...images];
        shuffle(currentDeck);
        
        // Ensure the first of new deck isn't same as last of pool (if pool exists)
        if (imagePool.length > 0 && currentDeck[0] === imagePool[imagePool.length - 1]) {
           // Swap first with last in new deck
           [currentDeck[0], currentDeck[currentDeck.length - 1]] = [currentDeck[currentDeck.length - 1], currentDeck[0]];
        }
      }
      imagePool.push(currentDeck.pop());
    }

    imagePool.forEach((src, index) => {
      const gridItem = document.createElement('div');
      gridItem.className = 'background-item';
      gridItem.style.backgroundImage = `url('${src}')`;
      
      // Randomize animation delay for a natural feel
      gridItem.style.animationDelay = `${Math.random() * 2}s`;
      
      // Add subtle float animation with random duration
      // Opacity 0.6 max (controlled by CSS keyframes now)
      gridItem.style.animation = `fadeIn 1.5s ease-out forwards, float ${20 + Math.random() * 10}s infinite ease-in-out`;
      gridItem.style.animationDelay = `${Math.random() * 3}s`; // Stagger start
      
      backgroundContainer.appendChild(gridItem);
    });
  }
});

