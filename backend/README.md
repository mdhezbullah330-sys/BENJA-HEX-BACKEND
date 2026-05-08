# BENJA HEX Backend API

A robust Node.js/Express backend with MongoDB for user authentication and management.

## 🚀 Features

- **Email Authentication** with bcrypt password hashing
- **Social OAuth** (Google & Discord) using Passport.js
- **JWT Token System** for secure API access
- **Rate Limiting** for security
- **CORS Configuration** for frontend integration
- **Input Validation** and error handling
- **MongoDB Integration** with Mongoose

## 📁 Project Structure

```
backend/
├── config/
│   ├── database.js     # MongoDB connection
│   └── passport.js     # Passport.js strategies
├── models/
│   └── User.js         # User model with methods
├── routes/
│   └── auth.js         # Authentication routes
├── .env.example        # Environment variables template
├── package.json        # Dependencies and scripts
├── server.js          # Main server file
└── README.md          # This file
```

## 🛠️ Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start MongoDB:**
   - Local: `mongod`
   - Or use MongoDB Atlas

4. **Run the server:**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 🔧 Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/benjahex

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_CALLBACK_URL=http://localhost:3000/api/auth/discord/callback

# Frontend
FRONTEND_URL=http://localhost:3000

# Server
PORT=3000
NODE_ENV=development
```

## 📡 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/check-email` | Check if email exists | No |
| POST | `/register` | Register new user | No |
| POST | `/login` | Login with email/password | No |
| GET | `/me` | Get current user | Yes |
| GET | `/google` | Google OAuth | No |
| GET | `/google/callback` | Google OAuth callback | No |
| GET | `/discord` | Discord OAuth | No |
| GET | `/discord/callback` | Discord OAuth callback | No |
| POST | `/logout` | Logout user | Yes |

### Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health status |

## 🔐 Authentication Flow

### Email Registration/Login
1. Client sends email/password to `/api/auth/register` or `/api/auth/login`
2. Server validates and hashes password with bcrypt
3. Server returns JWT token and user data
4. Client stores token for future requests

### OAuth Flow (Google/Discord)
1. Client redirects to `/api/auth/google` or `/api/auth/discord`
2. User authenticates with provider
3. Provider redirects to callback URL
4. Server creates/updates user and generates JWT
5. Server redirects back to frontend with token

### Token Usage
```
Authorization: Bearer <jwt_token>
```

## 🛡️ Security Features

- **Password Hashing** with bcrypt (cost: 12)
- **Rate Limiting** (5 auth attempts per 15 minutes)
- **CORS Protection** with allowed origins
- **Input Validation** using validator.js
- **Helmet.js** for security headers
- **JWT Expiration** (7 days default)

## 📊 User Model

```javascript
{
  email: String (unique, required),
  username: String (unique, required, 3-30 chars),
  password: String (hashed, required for email auth),
  role: String (user/admin, default: user),
  avatar: String,
  googleId: String (OAuth),
  discordId: String (OAuth),
  authMethod: String (email/google/discord),
  isActive: Boolean (default: true),
  lastLogin: Date,
  timestamps: true
}
```

## 🚀 Deployment

### Vercel (Serverless)
1. Push to GitHub
2. Connect to Vercel
3. Set environment variables in Vercel dashboard

### Traditional Hosting
1. Install PM2: `npm install -g pm2`
2. Start: `pm2 start server.js --name "benjahex-api"`
3. Monitor: `pm2 monit`

## 🧪 Testing

```bash
# Test endpoints
npm test

# Manual testing with curl
curl -X POST http://localhost:3000/api/auth/check-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

## 📝 Development Notes

- All passwords are hashed with bcrypt
- OAuth users don't need passwords
- JWT tokens expire in 7 days
- Rate limiting prevents brute force attacks
- CORS is configured for your frontend domain

## 🐛 Troubleshooting

**MongoDB Connection Issues:**
- Check MongoDB is running
- Verify connection string in .env
- Check network/firewall settings

**OAuth Issues:**
- Verify client IDs and secrets
- Check callback URLs match OAuth app settings
- Ensure frontend URL is in allowed origins

**Token Issues:**
- Verify JWT_SECRET is set
- Check token expiration
- Ensure Authorization header format: `Bearer <token>`

## 📞 Support

For issues or questions:
1. Check console logs
2. Verify environment variables
3. Test with Postman/curl
4. Check MongoDB connection
