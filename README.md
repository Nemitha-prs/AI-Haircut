🌟 HairCraft AI
AI-Powered Smart Hairstyle Recommendation Web App

HairCraft AI is a full-stack AI application that analyzes user-uploaded photos and recommends the best hairstyles using AI-powered face analysis and reasoning.
Built with Node.js, Express, JavaScript, and deployed on Vercel + Koyeb.

🚀 Live Demo

🔗 Frontend: https://ai-haircut.vercel.app/

🔗 Backend: Koyeb (private API)

🧠 Features
🔍 AI Hairstyle Analysis

Upload a photo

AI detects face shape, hair type & style compatibility

Returns top hairstyle recommendations

Clean reasoning + descriptions

🔐 User Authentication

Secure Email/Password login

Email verification via OTP

Google OAuth 2.0 Login (production-ready)

JWT-based session handling

🧩 Frontend

Modern UI (HTML, CSS, JavaScript)

Mobile responsive layout

Animated background photo grid

Clean UX with toast messages

🛠 Backend (Node.js + Express)

REST APIs for authentication + analysis

Secure password hashing

Usage-limiter (daily limits)

Error-safe routing

Deployed on Koyeb (port-based instance)

☁️ Deployment

Frontend → Vercel

Backend → Koyeb

Managed with environment variables

Works with Google Cloud OAuth Redirect URI



Project Structure
/frontend
   ├─ index.html
   ├─ login.html
   ├─ signup.html
   ├─ main.html
   ├─ results.html
   ├─ css/
   └─ js/

/backend
   ├─ server.js
   ├─ routes/
   ├─ models/
   ├─ middleware/
   ├─ package.json
   └─ .env (not committed)

⚙️ Tech Stack
Frontend

HTML5

CSS3

JavaScript (Vanilla)

Responsive UI

Custom animations

Backend

Node.js

Express.js

JWT Authentication

Google OAuth 2.0

Nodemailer (Email Verification)

AI

LLM Prompting for hairstyle recommendation

Image reasoning

Facial attribute analysis

Deployment

Vercel

Koyeb

Google Cloud OAuth

Environment Variables

🔒 Environment Variables

Create .env inside /backend:

PORT=3000

# Auth
JWT_SECRET=your_jwt_secret

# Email
SMTP_USER=your_email
SMTP_PASS=your_password

# Google OAuth
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_REDIRECT_URI=https://your-koyeb-url/auth/google/callback

# Frontend Base URL
FRONTEND_BASE_URL=https://ai-haircut.vercel.app

▶️ Running Locally
1️⃣ Clone the repository
git clone https://github.com/your-username/haircraft-ai.git
cd haircraft-ai

2️⃣ Install backend dependencies
cd backend
npm install

3️⃣ Start backend
node server.js

4️⃣ Open frontend

Use Live Server or host the HTML files through your IDE.

🧪 Future Improvements

More face-shape detection accuracy

Hairstyle filters (short/medium/long)

Gender-based recommendations

User accounts with saved results

Dark mode UI

Full AI pipeline with vision models

📝 License

MIT License

📬 Contact

If you have feedback or ideas, feel free to reach out!
