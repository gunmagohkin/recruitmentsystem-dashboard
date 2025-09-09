// netlify/functions/login.js
const jwt = require('jsonwebtoken');

const userPasswordKeys = {
  ivan_golosinda: 'USER_PASS_IVAN',
  rhazel_joyce_mantor: 'USER_PASS_RHAZEL_JOYCE',
  mildred_negranza: 'USER_PASS_MILDRED'
};

// Use a strong secret key (set this in your environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-secret-key-change-this';

exports.handler = async function (event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ success: false, message: 'Method Not Allowed' }),
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
      }
    };
  }

  try {
    const { userId, password } = JSON.parse(event.body);
    
    if (!userId || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, message: 'Missing username or password' }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      };
    }
    
    const passwordKey = userPasswordKeys[userId];
    const correctPassword = process.env[passwordKey];
    
    if (correctPassword && correctPassword.trim() === password.trim()) {
      // Create JWT token
      const token = jwt.sign(
        { 
          userId: userId, 
          loginTime: Date.now() 
        },
        JWT_SECRET,
        { expiresIn: '24h' } // Token expires in 24 hours
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Login successful',
          token: token,
          user: userId 
        }),
        headers: { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*' 
        }
      };
    } else {
      return {
        statusCode: 401,
        body: JSON.stringify({ success: false, message: 'Invalid credentials' }),
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      };
    }
  } catch (error) {
    console.error('Login function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Internal server error' }),
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    };
  }
};