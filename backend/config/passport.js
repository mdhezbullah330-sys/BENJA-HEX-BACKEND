const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const DiscordStrategy = require('passport-discord').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

// JWT Strategy for API authentication
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

// Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = await User.findOne({ 
      $or: [
        { googleId: profile.id },
        { email: profile.emails[0].value }
      ]
    });

    if (user) {
      // Update Google ID if user exists by email but no Google ID
      if (!user.googleId) {
        user.googleId = profile.id;
        user.authMethod = 'google';
        await user.save();
      }
      return done(null, user);
    }

    // Create new user
    user = await User.create({
      googleId: profile.id,
      username: profile.displayName.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 1000),
      email: profile.emails[0].value,
      avatar: profile.photos[0]?.value,
      authMethod: 'google',
      password: undefined // Not needed for OAuth users
    });

    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));

// Discord OAuth Strategy
passport.use(new DiscordStrategy({
  clientID: process.env.DISCORD_CLIENT_ID,
  clientSecret: process.env.DISCORD_CLIENT_SECRET,
  callbackURL: process.env.DISCORD_CALLBACK_URL,
  scope: ['identify', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = await User.findOne({ 
      $or: [
        { discordId: profile.id },
        { email: profile.email }
      ]
    });

    if (user) {
      // Update Discord ID if user exists by email but no Discord ID
      if (!user.discordId) {
        user.discordId = profile.id;
        user.authMethod = 'discord';
        await user.save();
      }
      return done(null, user);
    }

    // Create new user
    user = await User.create({
      discordId: profile.id,
      username: profile.username + Math.floor(Math.random() * 1000),
      email: profile.email,
      avatar: `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`,
      authMethod: 'discord',
      password: undefined // Not needed for OAuth users
    });

    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));

// GitHub OAuth Strategy
passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL,
  scope: ['user:email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Get primary email from GitHub profile
    const email = profile.emails && profile.emails.length > 0 
      ? profile.emails.find(email => email.primary).email 
      : profile.username + '@github.local'; // Fallback if no email

    // Check if user already exists
    let user = await User.findOne({ 
      $or: [
        { githubId: profile.id },
        { email: email }
      ]
    });

    if (user) {
      // Update GitHub ID if user exists by email but no GitHub ID
      if (!user.githubId) {
        user.githubId = profile.id;
        user.authMethod = 'github';
        await user.save();
      }
      return done(null, user);
    }

    // Create new user
    user = await User.create({
      githubId: profile.id,
      username: profile.username,
      email: email,
      avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
      authMethod: 'github',
      password: undefined // Not needed for OAuth users
    });

    done(null, user);
  } catch (error) {
    done(error, null);
  }
}));

// JWT Strategy for API routes
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET
}, async (payload, done) => {
  try {
    const user = await User.findById(payload.id);
    if (user) {
      return done(null, user);
    }
    return done(null, false);
  } catch (error) {
    done(error, false);
  }
}));

// Serialize and deserialize users (for sessions)
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
