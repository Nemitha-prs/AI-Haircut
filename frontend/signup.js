// ==================== DOM ELEMENTS & INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signup-form');
  const fullnameInput = document.getElementById('fullname');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const signupButton = document.getElementById('signup-button');
  const errorMessage = document.getElementById('error-message');
  const errorText = document.getElementById('error-text');
  const statusMessage = document.getElementById('status');
  const emailError = document.getElementById('emailError');
  const sendCodeBtn = document.getElementById('send-code-btn');
  const verifyCodeBtn = document.getElementById('verify-code-btn');
  const verificationInput = document.getElementById('verification-code');
  const verificationStatus = document.getElementById('verificationStatus');

  const STRONG_EMAIL_REGEX = /^(?![_.-])(?!.*[_.-]{2})([A-Za-z0-9._%+-]{1,64})@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/;
  const CODE_REGEX = /^\d{6}$/;
  let emailVerified = false;
  let isSubmitting = false;
  
  // Password Toggle Elements
  const togglePasswordBtn = document.getElementById('toggle-password');
  const passwordIcon = document.getElementById('password-icon');
  const toggleConfirmPasswordBtn = document.getElementById('toggle-confirm-password');
  const confirmPasswordIcon = document.getElementById('confirm-password-icon');

  // ==================== PASSWORD TOGGLE LOGIC ====================
  function setupPasswordToggle(btn, input, icon) {
    if (btn && input && icon) {
      btn.addEventListener('click', () => {
        const isPassword = input.type === 'password';
        
        // Toggle Input Type
        input.type = isPassword ? 'text' : 'password';
        
        // Toggle Icon Path
        if (isPassword) {
          // Show "Eye" (Visible)
          icon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          `;
        } else {
          // Show "Eye Off" (Hidden)
          icon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          `;
        }
      });
    }
  }

  setupPasswordToggle(togglePasswordBtn, passwordInput, passwordIcon);
  setupPasswordToggle(toggleConfirmPasswordBtn, confirmPasswordInput, confirmPasswordIcon);

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

  function showEmailFieldError(message) {
    if (emailError) {
      emailError.textContent = message;
      emailError.hidden = false;
    }
  }

  function clearEmailFieldError() {
    if (emailError) {
      emailError.hidden = true;
      emailError.textContent = '';
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
    if (!signupButton) return;
    isSubmitting = isLoading;
    signupButton.disabled = isLoading || !emailVerified;
    if (isLoading) {
      signupButton.classList.add('loading');
    } else {
      signupButton.classList.remove('loading');
    }
  }

  function updateSignupButtonState() {
    if (!signupButton) return;
    signupButton.disabled = isSubmitting || !emailVerified;
  }

  function showVerificationStatus(message, type = 'info') {
    if (!verificationStatus) return;
    verificationStatus.textContent = message;
    verificationStatus.classList.remove('success', 'info', 'error');
    verificationStatus.classList.add(type);
    verificationStatus.hidden = false;
  }

  function clearVerificationStatus() {
    if (verificationStatus) {
      verificationStatus.hidden = true;
      verificationStatus.textContent = '';
      verificationStatus.classList.remove('success', 'info', 'error');
    }
  }

  function isEmailFormatValid(value) {
    return STRONG_EMAIL_REGEX.test(value);
  }

  function resetEmailVerification() {
    emailVerified = false;
    clearVerificationStatus();
    if (verificationInput) verificationInput.value = '';
    updateSignupButtonState();
  }

  updateSignupButtonState();

  // ==================== FORM SUBMISSION ====================
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      hideError();
      hideStatus();
      clearEmailFieldError();
      
      const fullname = fullnameInput.value.trim();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const confirmPassword = confirmPasswordInput.value;

      // Basic validation
      if (!fullname || !email || !password || !confirmPassword) {
        showError('Please fill in all fields.');
        return;
      }

      if (!isEmailFormatValid(email)) {
        showEmailFieldError('Please enter a valid email address.');
        emailInput.focus();
        return;
      }

      if (!emailVerified) {
        showEmailFieldError('Please verify your email before creating an account.');
        return;
      }

      if (password.length < 6) {
        showError('Password must be at least 6 characters long.');
        return;
      }

      if (password !== confirmPassword) {
        showError('Passwords do not match.');
        return;
      }

      setButtonLoading(true);

      try {
        const response = await fetch('/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }) // Full name is not sent to backend as per instructions
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Signup failed');
        }

        // Store token
        localStorage.setItem('jwt', data.token);
        localStorage.setItem('authToken', data.token);
        
        // Optional: store user info
        localStorage.setItem('userEmail', data.user?.email || email);

        // Show success popup
        showSuccess('Account created successfully!');
        
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);

      } catch (err) {
        console.error('Signup error:', err);
        
        // Format error message
        let errorMsg = err.message || 'Signup failed';
        const lowerError = errorMsg.toLowerCase();
        
        if (lowerError.includes('exists') || 
            lowerError.includes('duplicate') || 
            lowerError.includes('already registered')) {
          showEmailFieldError('Email already registered');
          errorMsg = 'Email already registered';
        } else if (lowerError.includes('invalid email')) {
          showEmailFieldError('Invalid email address.');
          errorMsg = 'Invalid email';
        } else if (lowerError.includes('network') || 
                   lowerError.includes('fetch')) {
          errorMsg = 'Network error. Please check your connection.';
        }
        
        showError(errorMsg);
      } finally {
        setButtonLoading(false);
      }
    });
  }

  // ==================== INPUT FOCUS ANIMATIONS ====================
  if (emailInput) {
    emailInput.addEventListener('input', () => {
      hideError();
      clearEmailFieldError();
      resetEmailVerification();
    });
  }
  if (passwordInput) passwordInput.addEventListener('input', hideError);
  if (confirmPasswordInput) confirmPasswordInput.addEventListener('input', hideError);

  // ==================== EMAIL VERIFICATION FLOWS ====================
  async function sendVerificationCode() {
    hideError();
    clearEmailFieldError();
    clearVerificationStatus();
    emailVerified = false;
    updateSignupButtonState();

    const email = emailInput.value.trim();
    if (!isEmailFormatValid(email)) {
      showEmailFieldError('Please enter a valid email address (name@domain.com).');
      emailInput.focus();
      return;
    }

    if (sendCodeBtn) {
      sendCodeBtn.disabled = true;
      sendCodeBtn.textContent = 'Sending...';
    }

    try {
      const response = await fetch('/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to send verification code');
      }

      showVerificationStatus('Verification code sent. Please check your inbox.', 'info');
    } catch (err) {
      showEmailFieldError(err.message || 'Unable to send verification code');
    } finally {
      if (sendCodeBtn) {
        sendCodeBtn.textContent = 'Send Code';
        sendCodeBtn.disabled = false;
      }
    }
  }

  async function verifyEmailCode() {
    hideError();
    clearEmailFieldError();
    clearVerificationStatus();

    const email = emailInput.value.trim();
    const code = verificationInput.value.trim();

    if (!isEmailFormatValid(email)) {
      showEmailFieldError('Please enter a valid email address (name@domain.com).');
      emailInput.focus();
      return;
    }

    if (!CODE_REGEX.test(code)) {
      showVerificationStatus('Enter the 6-digit code we emailed you.', 'error');
      verificationInput.focus();
      return;
    }

    if (verifyCodeBtn) {
      verifyCodeBtn.disabled = true;
      verifyCodeBtn.textContent = 'Verifying...';
    }

    try {
      const response = await fetch('/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      emailVerified = true;
      showVerificationStatus('Email verified. You can now create your account.', 'success');
      updateSignupButtonState();
    } catch (err) {
      emailVerified = false;
      updateSignupButtonState();
      showVerificationStatus(err.message || 'Verification failed', 'error');
    } finally {
      if (verifyCodeBtn) {
        verifyCodeBtn.textContent = 'Verify Code';
        verifyCodeBtn.disabled = false;
      }
    }
  }

  if (sendCodeBtn) sendCodeBtn.addEventListener('click', sendVerificationCode);
  if (verifyCodeBtn) verifyCodeBtn.addEventListener('click', verifyEmailCode);

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
