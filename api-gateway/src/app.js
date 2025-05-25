const express = require('express');
const cors = require('cors');
const cluster = require('cluster');
const os = require('os');
require('dotenv').config();

const proxyRoutes = require('./routes/proxy');

// Khởi tạo cache để lưu trữ thông tin phiên
const NodeCache = require('node-cache');
const sessionCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 }); // TTL 1 giờ, kiểm tra mỗi 10 phút

// Sử dụng cluster để tận dụng nhiều CPU
const numCPUs = os.cpus().length;

// Khởi tạo ứng dụng Express
const app = express();

// Middleware
// Log requests chỉ trong môi trường phát triển và bỏ qua health checks
app.use((req, res, next) => {
  // Skip logging for OPTIONS requests và health checks
  if (process.env.NODE_ENV === 'development' &&
      req.method !== 'OPTIONS' &&
      !req.url.includes('/health')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  }
  next();
});

app.use(cors({
  origin: [
    'http://localhost',
    'http://localhost:80',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:8080'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Instance', 'X-Request-ID'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use(proxyRoutes);

// Health check endpoint
app.get('/health', (_req, res) => {
  // Loại bỏ log health check
  res.status(200).json({ status: 'ok', service: 'api-gateway' });
});



// Direct endpoints (bypass proxy)
app.post('/api/direct-register', async (req, res) => {
  try {
    const startTime = Date.now();

    // Always log registration attempts with masked email
    const regMaskedEmail = req.body.email ?
      `${req.body.email.substring(0, 3)}***@${req.body.email.split('@')[1]}` :
      'unknown';
    console.log(`[${new Date().toISOString()}] Registration attempt for: ${regMaskedEmail}`);

    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, password, and full name are required' });
    }

    // Call User Service directly
    const fetch = require('node-fetch');
    const userServiceUrl = process.env.USER_SERVICE_URL;

    if (!userServiceUrl) {
      return res.status(500).json({ error: 'USER_SERVICE_URL not configured' });
    }

    // Always log forwarded registration requests
    console.log(`[${new Date().toISOString()}] Forwarding registration to User Service for: ${regMaskedEmail}`);

    const response = await fetch(`${userServiceUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, full_name }),
      timeout: 10000
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json();
      // Always log registration failures
      console.error(`[${new Date().toISOString()}] Registration failed for: ${regMaskedEmail} (${duration}ms)`);
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();

    // Always log successful registrations
    console.log(`[${new Date().toISOString()}] Registration successful for: ${regMaskedEmail} (${duration}ms)`);

    return res.status(201).json(data);
  } catch (error) {
    // Always log internal server errors
    console.error(`[${new Date().toISOString()}] Internal server error in registration endpoint:`, error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/direct-login', async (req, res) => {
  try {
    const startTime = Date.now();

    // Always log login attempts with masked email for security
    const maskedEmail = req.body.email ?
      `${req.body.email.substring(0, 3)}***@${req.body.email.split('@')[1]}` :
      'unknown';
    console.log(`[${new Date().toISOString()}] Login attempt for: ${maskedEmail}`);
    console.log(`[${new Date().toISOString()}] Request body:`, req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      console.log(`[${new Date().toISOString()}] Missing email or password`);
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // For test user in development environment only
    if (process.env.NODE_ENV === 'development' && email === 'test@example.com' && password === 'password123') {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        {
          id: '123456',
          email: email,
          aud: 'authenticated'
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      const duration = Date.now() - startTime;

      // Always log successful logins for test user
      console.log(`[${new Date().toISOString()}] Login successful for test user (${duration}ms)`);

      return res.status(200).json({
        message: 'Login successful',
        user: {
          id: '123456',
          email: email,
          full_name: 'Test User',
          avatar_url: null
        },
        token
      });
    }

    // For other users, call User Service directly
    const fetch = require('node-fetch');
    const userServiceUrl = process.env.USER_SERVICE_URL;

    if (!userServiceUrl) {
      console.log(`[${new Date().toISOString()}] USER_SERVICE_URL not configured`);
      return res.status(500).json({ error: 'USER_SERVICE_URL not configured' });
    }

    console.log(`[${new Date().toISOString()}] Calling User Service login endpoint directly...`);
    console.log(`[${new Date().toISOString()}] User Service URL: ${userServiceUrl}`);

    try {
      const response = await fetch(`${userServiceUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        timeout: 5000
      });

      console.log(`[${new Date().toISOString()}] User Service response status: ${response.status}`);

      const duration = Date.now() - startTime;

      if (!response.ok) {
        try {
          const errorData = await response.json();
          // Only log error details in development
          if (process.env.NODE_ENV === 'development') {
            console.error(`[${new Date().toISOString()}] Login failed (${duration}ms)`);
            console.error(`[${new Date().toISOString()}] Error data:`, errorData);
          }
          return res.status(response.status).json(errorData);
        } catch (jsonError) {
          console.error(`[${new Date().toISOString()}] Error parsing response JSON:`, jsonError);
          return res.status(response.status).json({ error: 'Invalid login credentials' });
        }
      }

      const loginData = await response.json();

      // Always log successful logins with masked email
      const loginMaskedEmail = loginData.user && loginData.user.email ?
        `${loginData.user.email.substring(0, 3)}***@${loginData.user.email.split('@')[1]}` :
        'unknown';
      console.log(`[${new Date().toISOString()}] Login successful for user: ${loginMaskedEmail} (${duration}ms)`);

      // Return the login data directly without trying to fetch profile
      return res.status(200).json(loginData);
    } catch (fetchError) {
      console.error(`[${new Date().toISOString()}] Fetch error:`, fetchError);
      return res.status(500).json({ error: 'Error connecting to User Service' });
    }
  } catch (error) {
    // Always log internal server errors
    console.error(`[${new Date().toISOString()}] Internal server error in login endpoint:`, error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Direct profile endpoint (bypasses proxy)
app.get('/api/direct-profile', async (req, res) => {
  try {
    const startTime = Date.now();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Always log profile requests
    console.log(`[${new Date().toISOString()}] Profile request received`);

    // Verify token
    const jwt = require('jsonwebtoken');
    const token = authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);

      // Always log verified tokens with masked email
      const profileMaskedEmail = verified.email ?
        `${verified.email.substring(0, 3)}***@${verified.email.split('@')[1]}` :
        'unknown';
      console.log(`[${new Date().toISOString()}] Token verified for user: ${profileMaskedEmail}`);

      // For test user in development environment only
      if (process.env.NODE_ENV === 'development' && verified.email === 'test@example.com') {
        // Always log test user profile responses
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] Returning test user profile (${duration}ms)`);

        return res.status(200).json({
          profile: {
            id: verified.id,
            email: verified.email,
            full_name: 'Test User',
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        });
      }

      // For other users, call User Service directly
      const fetch = require('node-fetch');
      const userServiceUrl = process.env.USER_SERVICE_URL;

      if (!userServiceUrl) {
        return res.status(500).json({ error: 'USER_SERVICE_URL not configured' });
      }

      // Always log forwarded requests
      console.log(`[${new Date().toISOString()}] Forwarding profile request to User Service for: ${profileMaskedEmail}`);

      // Thêm header X-Request-ID để theo dõi request
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

      const response = await fetch(`${userServiceUrl}/api/users/profile`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'X-Request-ID': requestId
        },
        timeout: 15000 // Tăng timeout lên 15 giây để đảm bảo có đủ thời gian xử lý
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        // Always log profile request failures
        console.error(`[${new Date().toISOString()}] Profile request failed for user: ${profileMaskedEmail} (${duration}ms)`);

        // Nếu lỗi là "User profile not found", thử tìm profile trong Supabase trực tiếp
        if (response.status === 404 && errorData.error === 'User profile not found') {
          console.log(`[${new Date().toISOString()}] Profile not found for user: ${profileMaskedEmail}, ID: ${verified.id}`);
          console.log(`[${new Date().toISOString()}] Request ID: ${requestId}, Response status: ${response.status}`);

          // Log thêm thông tin để debug
          console.log(`[${new Date().toISOString()}] User ID type: ${typeof verified.id}`);
          console.log(`[${new Date().toISOString()}] User ID value: ${verified.id}`);

          // Thử gọi API admin để lấy profile trực tiếp từ Supabase
          try {
            console.log(`[${new Date().toISOString()}] Trying to get profile directly from Supabase using admin API`);

            const adminResponse = await fetch(`${userServiceUrl}/api/admin/profiles/${verified.id}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${process.env.ADMIN_SECRET_KEY}`,
                'X-Request-ID': `${requestId}-admin`,
                'X-User-Email': verified.email
              },
              timeout: 15000
            });

            if (adminResponse.ok) {
              const adminData = await adminResponse.json();
              console.log(`[${new Date().toISOString()}] Admin API successful, returning profile`);

              // Thử cập nhật cache trong user-service
              try {
                await fetch(`${userServiceUrl}/api/admin/cache/update`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.ADMIN_SECRET_KEY}`
                  },
                  body: JSON.stringify({
                    type: 'profile',
                    userId: verified.id,
                    data: adminData.profile
                  }),
                  timeout: 5000
                });
                console.log(`[${new Date().toISOString()}] Cache update request sent`);
              } catch (cacheError) {
                console.error(`[${new Date().toISOString()}] Error updating cache:`, cacheError.message);
              }

              return res.status(200).json(adminData);
            } else {
              console.log(`[${new Date().toISOString()}] Admin API failed, returning temporary profile`);
            }
          } catch (adminError) {
            console.error(`[${new Date().toISOString()}] Error in admin API:`, adminError.message);
          }

          // Trả về profile tạm thời
          console.log(`[${new Date().toISOString()}] Returning temporary profile for user: ${profileMaskedEmail}`);

          const temporaryProfile = {
            id: verified.id,
            email: verified.email,
            full_name: verified.email.split('@')[0],
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          return res.status(200).json({ profile: temporaryProfile });
        }

        return res.status(response.status).json(errorData);
      }

      const data = await response.json();

      // Always log successful profile requests
      console.log(`[${new Date().toISOString()}] Profile request successful for user: ${profileMaskedEmail} (${duration}ms)`);

      return res.status(200).json(data);
    } catch (jwtError) {
      // Always log JWT verification failures
      console.error(`[${new Date().toISOString()}] JWT verification failed for token: ${token.substring(0, 10)}...`);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    // Always log internal server errors
    console.error(`[${new Date().toISOString()}] Internal server error in profile endpoint:`, error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Direct settings endpoint (bypasses proxy)
app.get('/api/direct-settings', async (req, res) => {
  try {
    const startTime = Date.now();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Always log settings requests
    console.log(`[${new Date().toISOString()}] Settings request received`);

    // Verify token
    const jwt = require('jsonwebtoken');
    const token = authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);

      // Always log verified tokens with masked email
      const settingsMaskedEmail = verified.email ?
        `${verified.email.substring(0, 3)}***@${verified.email.split('@')[1]}` :
        'unknown';
      console.log(`[${new Date().toISOString()}] Token verified for user: ${settingsMaskedEmail}`);

      // For test user in development environment only
      if (process.env.NODE_ENV === 'development' && verified.email === 'test@example.com') {
        // Always log test user settings responses
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] Returning test user settings (${duration}ms)`);

        return res.status(200).json({
          settings: {
            id: '123456',
            user_id: verified.id,
            theme: 'dark',
            language: 'en',
            gemini_api_key: '',
            vapi_api_key: '',
            raper_url: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        });
      }

      // For other users, call User Service directly
      const fetch = require('node-fetch');
      const userServiceUrl = process.env.USER_SERVICE_URL;

      if (!userServiceUrl) {
        return res.status(500).json({ error: 'USER_SERVICE_URL not configured' });
      }

      // Always log forwarded requests
      console.log(`[${new Date().toISOString()}] Forwarding settings request to User Service for: ${settingsMaskedEmail}`);

      const response = await fetch(`${userServiceUrl}/api/settings`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        },
        timeout: 5000
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        // Always log settings request failures
        console.error(`[${new Date().toISOString()}] Settings request failed for user: ${settingsMaskedEmail} (${duration}ms)`);

        // Thử gọi lại API với quyền admin để lấy dữ liệu
        if (response.status === 400 && errorData.error && errorData.error.includes('row-level security policy')) {
          console.log(`[${new Date().toISOString()}] RLS error, trying to get settings with admin rights for user: ${settingsMaskedEmail}`);

          try {
            // Gọi API đặc biệt để lấy settings với quyền admin
            const adminResponse = await fetch(`${userServiceUrl}/api/admin/settings/${verified.id}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${process.env.ADMIN_SECRET_KEY}`,
                'X-User-Email': verified.email
              },
              timeout: 5000
            });

            if (adminResponse.ok) {
              const adminData = await adminResponse.json();
              console.log(`[${new Date().toISOString()}] Successfully retrieved settings with admin rights for user: ${settingsMaskedEmail}`);
              return res.status(200).json(adminData);
            } else {
              console.error(`[${new Date().toISOString()}] Failed to get settings with admin rights for user: ${settingsMaskedEmail}`);
            }
          } catch (adminError) {
            console.error(`[${new Date().toISOString()}] Error getting settings with admin rights:`, adminError.message);
          }
        }

        return res.status(response.status).json(errorData);
      }

      const data = await response.json();

      // Always log successful settings requests
      console.log(`[${new Date().toISOString()}] Settings request successful for user: ${settingsMaskedEmail} (${duration}ms)`);

      return res.status(200).json(data);
    } catch (jwtError) {
      // Always log JWT verification failures
      console.error(`[${new Date().toISOString()}] JWT verification failed for token: ${token.substring(0, 10)}...`);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    // Always log internal server errors
    console.error(`[${new Date().toISOString()}] Internal server error in settings endpoint:`, error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Direct update settings endpoint (bypasses proxy)
app.put('/api/direct-settings', async (req, res) => {
  try {
    const startTime = Date.now();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Always log settings update requests
    console.log(`[${new Date().toISOString()}] Settings update request received`);

    // Verify token
    const jwt = require('jsonwebtoken');
    const token = authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);

      // Always log verified tokens with masked email
      const settingsMaskedEmail = verified.email ?
        `${verified.email.substring(0, 3)}***@${verified.email.split('@')[1]}` :
        'unknown';
      console.log(`[${new Date().toISOString()}] Token verified for user: ${settingsMaskedEmail}`);

      // For test user in development environment only
      if (process.env.NODE_ENV === 'development' && verified.email === 'test@example.com') {
        // Always log test user settings update responses
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] Updating test user settings (${duration}ms)`);

        return res.status(200).json({
          message: 'Settings updated successfully',
          settings: {
            id: '123456',
            user_id: verified.id,
            theme: req.body.theme || 'dark',
            language: req.body.language || 'en',
            gemini_api_key: req.body.gemini_api_key || '',
            vapi_api_key: req.body.vapi_api_key || '',
            raper_url: req.body.raper_url || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        });
      }

      // For other users, call User Service directly
      const fetch = require('node-fetch');
      const userServiceUrl = process.env.USER_SERVICE_URL;

      if (!userServiceUrl) {
        return res.status(500).json({ error: 'USER_SERVICE_URL not configured' });
      }

      // Always log forwarded requests
      console.log(`[${new Date().toISOString()}] Forwarding settings update request to User Service for: ${settingsMaskedEmail}`);

      const response = await fetch(`${userServiceUrl}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(req.body),
        timeout: 5000
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        // Always log settings update request failures
        console.error(`[${new Date().toISOString()}] Settings update request failed for user: ${settingsMaskedEmail} (${duration}ms)`);

        // Thử gọi lại API với quyền admin để cập nhật dữ liệu
        if (response.status === 400 && errorData.error && errorData.error.includes('row-level security policy')) {
          console.log(`[${new Date().toISOString()}] RLS error, trying to update settings with admin rights for user: ${settingsMaskedEmail}`);

          try {
            // Gọi API đặc biệt để cập nhật settings với quyền admin
            const adminResponse = await fetch(`${userServiceUrl}/api/admin/settings/${verified.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.ADMIN_SECRET_KEY}`,
                'X-User-Email': verified.email
              },
              body: JSON.stringify(req.body),
              timeout: 5000
            });

            if (adminResponse.ok) {
              const adminData = await adminResponse.json();
              console.log(`[${new Date().toISOString()}] Successfully updated settings with admin rights for user: ${settingsMaskedEmail}`);
              return res.status(200).json(adminData);
            } else {
              console.error(`[${new Date().toISOString()}] Failed to update settings with admin rights for user: ${settingsMaskedEmail}`);
            }
          } catch (adminError) {
            console.error(`[${new Date().toISOString()}] Error updating settings with admin rights:`, adminError.message);
          }
        }

        return res.status(response.status).json(errorData);
      }

      const data = await response.json();

      // Always log successful settings update requests
      console.log(`[${new Date().toISOString()}] Settings update request successful for user: ${settingsMaskedEmail} (${duration}ms)`);

      return res.status(200).json(data);
    } catch (jwtError) {
      // Always log JWT verification failures
      console.error(`[${new Date().toISOString()}] JWT verification failed for token: ${token.substring(0, 10)}...`);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    // Always log internal server errors
    console.error(`[${new Date().toISOString()}] Internal server error in settings update endpoint:`, error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Direct chats endpoint (bypasses proxy)
app.get('/api/direct-chats', async (req, res) => {
  try {
    const startTime = Date.now();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Always log chats requests
    console.log(`[${new Date().toISOString()}] Chats request received`);

    // Verify token
    const jwt = require('jsonwebtoken');
    const token = authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);

      // Always log verified tokens with masked email
      const chatsMaskedEmail = verified.email ?
        `${verified.email.substring(0, 3)}***@${verified.email.split('@')[1]}` :
        'unknown';
      console.log(`[${new Date().toISOString()}] Token verified for user: ${chatsMaskedEmail}`);

      // For test user in development environment only
      if (process.env.NODE_ENV === 'development' && verified.email === 'test@example.com') {
        // Always log test user chats responses
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] Returning test user chats (${duration}ms)`);

        return res.status(200).json({
          chats: []
        });
      }

      // For other users, call Chat Service directly
      const fetch = require('node-fetch');
      const chatServiceUrl = process.env.CHAT_SERVICE_URL || 'http://localhost:3004';

      if (!chatServiceUrl) {
        return res.status(500).json({ error: 'CHAT_SERVICE_URL not configured' });
      }

      // Always log forwarded requests
      console.log(`[${new Date().toISOString()}] Forwarding chats request to Chat Service for: ${chatsMaskedEmail}`);

      const response = await fetch(`${chatServiceUrl}/api/chats`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        },
        timeout: 5000
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        // Always log chats request failures
        console.error(`[${new Date().toISOString()}] Chats request failed for user: ${chatsMaskedEmail} (${duration}ms)`);
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();

      // Always log successful chats requests
      console.log(`[${new Date().toISOString()}] Chats request successful for user: ${chatsMaskedEmail} (${duration}ms)`);

      return res.status(200).json(data);
    } catch (jwtError) {
      // Always log JWT verification failures
      console.error(`[${new Date().toISOString()}] JWT verification failed for token: ${token.substring(0, 10)}...`);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    // Always log internal server errors
    console.error(`[${new Date().toISOString()}] Internal server error in chats endpoint:`, error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Direct chat by ID endpoint (bypasses proxy)
app.get('/api/direct-chats/:chatId', async (req, res) => {
  try {
    const startTime = Date.now();
    const authHeader = req.headers.authorization;
    const chatId = req.params.chatId;

    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Always log chat by ID requests
    console.log(`[${new Date().toISOString()}] Chat by ID request received for chat: ${chatId}`);

    // Verify token
    const jwt = require('jsonwebtoken');
    const token = authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);

      // Always log verified tokens with masked email
      const chatMaskedEmail = verified.email ?
        `${verified.email.substring(0, 3)}***@${verified.email.split('@')[1]}` :
        'unknown';
      console.log(`[${new Date().toISOString()}] Token verified for user: ${chatMaskedEmail}`);

      // For test user in development environment only
      if (process.env.NODE_ENV === 'development' && verified.email === 'test@example.com') {
        // Always log test user chat responses
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] Returning test user chat (${duration}ms)`);

        return res.status(200).json({
          chat: {
            id: chatId,
            user_id: verified.id,
            title: 'Test Chat',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          messages: []
        });
      }

      // For other users, call Chat Service directly
      const fetch = require('node-fetch');
      const chatServiceUrl = process.env.CHAT_SERVICE_URL || 'http://localhost:3004';

      if (!chatServiceUrl) {
        return res.status(500).json({ error: 'CHAT_SERVICE_URL not configured' });
      }

      // Always log forwarded requests
      console.log(`[${new Date().toISOString()}] Forwarding chat request to Chat Service for: ${chatMaskedEmail}`);

      const response = await fetch(`${chatServiceUrl}/api/chats/${chatId}`, {
        method: 'GET',
        headers: {
          'Authorization': authHeader
        },
        timeout: 5000
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        // Always log chat request failures
        console.error(`[${new Date().toISOString()}] Chat request failed for user: ${chatMaskedEmail} (${duration}ms)`);
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();

      // Always log successful chat requests
      console.log(`[${new Date().toISOString()}] Chat request successful for user: ${chatMaskedEmail} (${duration}ms)`);

      return res.status(200).json(data);
    } catch (jwtError) {
      // Always log JWT verification failures
      console.error(`[${new Date().toISOString()}] JWT verification failed for token: ${token.substring(0, 10)}...`);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    // Always log internal server errors
    console.error(`[${new Date().toISOString()}] Internal server error in chat endpoint:`, error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Direct create chat endpoint (bypasses proxy)
app.post('/api/direct-chats', async (req, res) => {
  try {
    const startTime = Date.now();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Always log create chat requests
    console.log(`[${new Date().toISOString()}] Create chat request received`);

    // Verify token
    const jwt = require('jsonwebtoken');
    const token = authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);

      // Always log verified tokens with masked email
      const chatMaskedEmail = verified.email ?
        `${verified.email.substring(0, 3)}***@${verified.email.split('@')[1]}` :
        'unknown';
      console.log(`[${new Date().toISOString()}] Token verified for user: ${chatMaskedEmail}`);

      // For test user in development environment only
      if (process.env.NODE_ENV === 'development' && verified.email === 'test@example.com') {
        // Always log test user create chat responses
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] Creating test user chat (${duration}ms)`);

        return res.status(201).json({
          message: 'Chat created successfully',
          chat: {
            id: Date.now().toString(),
            user_id: verified.id,
            title: req.body.title || 'New Chat',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        });
      }

      // For other users, call Chat Service directly
      const fetch = require('node-fetch');
      const chatServiceUrl = process.env.CHAT_SERVICE_URL || 'http://localhost:3004';

      if (!chatServiceUrl) {
        return res.status(500).json({ error: 'CHAT_SERVICE_URL not configured' });
      }

      // Always log forwarded requests
      console.log(`[${new Date().toISOString()}] Forwarding create chat request to Chat Service for: ${chatMaskedEmail}`);

      const response = await fetch(`${chatServiceUrl}/api/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(req.body),
        timeout: 5000
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        // Always log create chat request failures
        console.error(`[${new Date().toISOString()}] Create chat request failed for user: ${chatMaskedEmail} (${duration}ms)`);
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();

      // Always log successful create chat requests
      console.log(`[${new Date().toISOString()}] Create chat request successful for user: ${chatMaskedEmail} (${duration}ms)`);

      return res.status(201).json(data);
    } catch (jwtError) {
      // Always log JWT verification failures
      console.error(`[${new Date().toISOString()}] JWT verification failed for token: ${token.substring(0, 10)}...`);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    // Always log internal server errors
    console.error(`[${new Date().toISOString()}] Internal server error in create chat endpoint:`, error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Direct send message endpoint (bypasses proxy)
app.post('/api/direct-chats/:chatId/messages', async (req, res) => {
  try {
    const startTime = Date.now();
    const authHeader = req.headers.authorization;
    const chatId = req.params.chatId;

    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Always log send message requests
    console.log(`[${new Date().toISOString()}] Send message request received for chat: ${chatId}`);

    // Verify token
    const jwt = require('jsonwebtoken');
    const token = authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);

      // Always log verified tokens with masked email
      const messageMaskedEmail = verified.email ?
        `${verified.email.substring(0, 3)}***@${verified.email.split('@')[1]}` :
        'unknown';
      console.log(`[${new Date().toISOString()}] Token verified for user: ${messageMaskedEmail}`);

      // For test user in development environment only
      if (process.env.NODE_ENV === 'development' && verified.email === 'test@example.com') {
        // Always log test user send message responses
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] Sending test user message (${duration}ms)`);

        const userMessage = {
          id: `user-${Date.now()}`,
          chat_id: chatId,
          role: 'user',
          content: req.body.content,
          created_at: new Date().toISOString()
        };

        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          chat_id: chatId,
          role: 'assistant',
          content: `This is a test response to: "${req.body.content}"`,
          created_at: new Date(Date.now() + 1000).toISOString()
        };

        return res.status(200).json({
          userMessage,
          assistantMessage
        });
      }

      // For other users, call Chat Service directly
      const fetch = require('node-fetch');
      const chatServiceUrl = process.env.CHAT_SERVICE_URL || 'http://localhost:3004';

      if (!chatServiceUrl) {
        return res.status(500).json({ error: 'CHAT_SERVICE_URL not configured' });
      }

      // Lấy thông tin client instance nếu có
      const clientInstance = req.headers['x-client-instance'] || 'unknown-client';

      // Always log forwarded requests with client instance
      console.log(`[${new Date().toISOString()}] Forwarding send message request to Chat Service for: ${messageMaskedEmail} (Client: ${clientInstance})`);

      const response = await fetch(`${chatServiceUrl}/api/chats/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
          'X-Client-Instance': clientInstance
        },
        body: JSON.stringify(req.body),
        timeout: 30000 // Longer timeout for Gemini API calls
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        // Always log send message request failures
        console.error(`[${new Date().toISOString()}] Send message request failed for user: ${messageMaskedEmail} (${duration}ms)`);
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();

      // Always log successful send message requests
      console.log(`[${new Date().toISOString()}] Send message request successful for user: ${messageMaskedEmail} (${duration}ms)`);

      return res.status(200).json(data);
    } catch (jwtError) {
      // Always log JWT verification failures
      console.error(`[${new Date().toISOString()}] JWT verification failed for token: ${token.substring(0, 10)}...`);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    // Always log internal server errors
    console.error(`[${new Date().toISOString()}] Internal server error in send message endpoint:`, error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});



// Direct update chat title endpoint (bypasses proxy)
app.put('/api/direct-chats/:chatId', async (req, res) => {
  try {
    const startTime = Date.now();
    const authHeader = req.headers.authorization;
    const chatId = req.params.chatId;

    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Always log update chat title requests
    console.log(`[${new Date().toISOString()}] Update chat title request received for chat: ${chatId}`);

    // Verify token
    const jwt = require('jsonwebtoken');
    const token = authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);

      // Always log verified tokens with masked email
      const chatMaskedEmail = verified.email ?
        `${verified.email.substring(0, 3)}***@${verified.email.split('@')[1]}` :
        'unknown';
      console.log(`[${new Date().toISOString()}] Token verified for user: ${chatMaskedEmail}`);

      // For test user in development environment only
      if (process.env.NODE_ENV === 'development' && verified.email === 'test@example.com') {
        // Always log test user update chat title responses
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] Updating test user chat title (${duration}ms)`);

        return res.status(200).json({
          message: 'Chat title updated successfully',
          chat: {
            id: chatId,
            user_id: verified.id,
            title: req.body.title || 'Updated Chat',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        });
      }

      // For other users, call Chat Service directly
      const fetch = require('node-fetch');
      const chatServiceUrl = process.env.CHAT_SERVICE_URL || 'http://localhost:3004';

      if (!chatServiceUrl) {
        return res.status(500).json({ error: 'CHAT_SERVICE_URL not configured' });
      }

      // Always log forwarded requests
      console.log(`[${new Date().toISOString()}] Forwarding update chat title request to Chat Service for: ${chatMaskedEmail}`);

      const response = await fetch(`${chatServiceUrl}/api/chats/${chatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        body: JSON.stringify(req.body),
        timeout: 5000
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        // Always log update chat title request failures
        console.error(`[${new Date().toISOString()}] Update chat title request failed for user: ${chatMaskedEmail} (${duration}ms)`);
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();

      // Always log successful update chat title requests
      console.log(`[${new Date().toISOString()}] Update chat title request successful for user: ${chatMaskedEmail} (${duration}ms)`);

      return res.status(200).json(data);
    } catch (jwtError) {
      // Always log JWT verification failures
      console.error(`[${new Date().toISOString()}] JWT verification failed for token: ${token.substring(0, 10)}...`);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    // Always log internal server errors
    console.error(`[${new Date().toISOString()}] Internal server error in update chat title endpoint:`, error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Direct delete chat endpoint (bypasses proxy)
app.delete('/api/direct-chats/:chatId', async (req, res) => {
  try {
    const startTime = Date.now();
    const authHeader = req.headers.authorization;
    const chatId = req.params.chatId;

    if (!authHeader) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // Always log delete chat requests
    console.log(`[${new Date().toISOString()}] Delete chat request received for chat: ${chatId}`);

    // Verify token
    const jwt = require('jsonwebtoken');
    const token = authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
      const verified = jwt.verify(token, process.env.JWT_SECRET);

      // Always log verified tokens with masked email
      const chatMaskedEmail = verified.email ?
        `${verified.email.substring(0, 3)}***@${verified.email.split('@')[1]}` :
        'unknown';
      console.log(`[${new Date().toISOString()}] Token verified for user: ${chatMaskedEmail}`);

      // For test user in development environment only
      if (process.env.NODE_ENV === 'development' && verified.email === 'test@example.com') {
        // Always log test user delete chat responses
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] Deleting test user chat (${duration}ms)`);

        return res.status(200).json({
          message: 'Chat deleted successfully'
        });
      }

      // For other users, call Chat Service directly
      const fetch = require('node-fetch');
      const chatServiceUrl = process.env.CHAT_SERVICE_URL || 'http://localhost:3004';

      if (!chatServiceUrl) {
        return res.status(500).json({ error: 'CHAT_SERVICE_URL not configured' });
      }

      // Always log forwarded requests
      console.log(`[${new Date().toISOString()}] Forwarding delete chat request to Chat Service for: ${chatMaskedEmail}`);

      const response = await fetch(`${chatServiceUrl}/api/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': authHeader
        },
        timeout: 5000
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorData = await response.json();
        // Always log delete chat request failures
        console.error(`[${new Date().toISOString()}] Delete chat request failed for user: ${chatMaskedEmail} (${duration}ms)`);
        return res.status(response.status).json(errorData);
      }

      const data = await response.json();

      // Always log successful delete chat requests
      console.log(`[${new Date().toISOString()}] Delete chat request successful for user: ${chatMaskedEmail} (${duration}ms)`);

      return res.status(200).json(data);
    } catch (jwtError) {
      // Always log JWT verification failures
      console.error(`[${new Date().toISOString()}] JWT verification failed for token: ${token.substring(0, 10)}...`);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    // Always log internal server errors
    console.error(`[${new Date().toISOString()}] Internal server error in delete chat endpoint:`, error.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  // Always log errors, but with different detail levels based on environment
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${new Date().toISOString()}] Error:`, err.message, err.stack);
  } else {
    // In production, just log the error message without the stack trace
    console.error(`[${new Date().toISOString()}] Server error:`, err.message);
  }

  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
