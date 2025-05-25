#!/usr/bin/env node

/**
 * Script test để kiểm tra API Gateway routes
 * Chạy: node test-routes.js
 */

require('dotenv').config();

const testRoutes = [
  // User Service Routes
  {
    service: 'User Service',
    routes: [
      'POST /api/user-service/auth/login',
      'POST /api/user-service/auth/register', 
      'GET /api/user-service/users/profile',
      'GET /api/user-service/settings',
      'PUT /api/user-service/settings'
    ]
  },
  
  // Chat Service Routes
  {
    service: 'Chat Service',
    routes: [
      'GET /api/chat-service/chats',
      'POST /api/chat-service/chats',
      'GET /api/chat-service/chats/:chatId',
      'POST /api/chat-service/chats/:chatId/messages'
    ]
  },
  
  // Voice Service Routes
  {
    service: 'Voice Service',
    routes: [
      'GET /api/voice-service/voice/config',
      'GET /api/voice-service/voice/web-token',
      'POST /api/voice-service/voice/calls',
      'GET /api/voice-service/voice/calls/:callId',
      'PUT /api/voice-service/voice/calls/:callId',
      'DELETE /api/voice-service/voice/calls/:callId',
      'GET /api/voice-service/voice/history'
    ]
  }
];

const serviceUrls = {
  'User Service': process.env.USER_SERVICE_URL || 'http://localhost:3001',
  'Chat Service': process.env.CHAT_SERVICE_URL || 'http://localhost:3004', 
  'Voice Service': process.env.VOICE_SERVICE_URL || 'http://localhost:3005'
};

function showRouteMapping() {
  console.log('🗺️  API Gateway Route Mapping\n');
  console.log('=' .repeat(80));
  console.log();

  testRoutes.forEach(({ service, routes }) => {
    console.log(`📋 ${service} (${serviceUrls[service]})`);
    console.log('-'.repeat(60));
    
    routes.forEach(route => {
      const [method, path] = route.split(' ');
      let targetPath = path;
      
      // Show path rewriting
      if (path.startsWith('/api/user-service')) {
        targetPath = path.replace('/api/user-service', '/api');
      } else if (path.startsWith('/api/chat-service')) {
        targetPath = path.replace('/api/chat-service', '/api');
      } else if (path.startsWith('/api/voice-service')) {
        targetPath = path.replace('/api/voice-service', '/api');
      }
      
      console.log(`   ${method.padEnd(6)} ${path}`);
      console.log(`   ${''.padEnd(6)} → ${serviceUrls[service]}${targetPath}`);
      console.log();
    });
    
    console.log();
  });
}

function showAuthenticationFlow() {
  console.log('🔐 Authentication Flow\n');
  console.log('=' .repeat(80));
  console.log();
  
  console.log('📋 Public Routes (No Authentication Required):');
  console.log('   POST /api/user-service/auth/login');
  console.log('   POST /api/user-service/auth/register');
  console.log('   GET  /health');
  console.log();
  
  console.log('📋 Protected Routes (Authentication Required):');
  console.log('   All other routes require Bearer token in Authorization header');
  console.log();
  
  console.log('📋 Authentication Process:');
  console.log('   1. Client sends login request to /api/user-service/auth/login');
  console.log('   2. API Gateway forwards to User Service');
  console.log('   3. User Service returns JWT token');
  console.log('   4. Client includes token in subsequent requests');
  console.log('   5. API Gateway verifies token before forwarding');
  console.log();
}

function showProxyConfiguration() {
  console.log('⚙️  Proxy Configuration\n');
  console.log('=' .repeat(80));
  console.log();
  
  console.log('📋 Service Targets:');
  console.log(`   User Service:  ${serviceUrls['User Service']}`);
  console.log(`   Chat Service:  ${serviceUrls['Chat Service']}`);
  console.log(`   Voice Service: ${serviceUrls['Voice Service']}`);
  console.log();
  
  console.log('📋 Proxy Settings:');
  console.log('   • Change Origin: true');
  console.log('   • Timeout: 10-60 seconds (varies by service)');
  console.log('   • Buffer: 10MB max body size');
  console.log('   • Error Handling: Automatic retry and logging');
  console.log();
  
  console.log('📋 Path Rewriting:');
  console.log('   /api/user-service/*  → /api/*');
  console.log('   /api/chat-service/*  → /api/*');
  console.log('   /api/voice-service/* → /api/*');
  console.log();
}

function showEnvironmentCheck() {
  console.log('🌍 Environment Check\n');
  console.log('=' .repeat(80));
  console.log();
  
  const requiredEnvVars = [
    'PORT',
    'USER_SERVICE_URL', 
    'CHAT_SERVICE_URL',
    'VOICE_SERVICE_URL',
    'JWT_SECRET'
  ];
  
  console.log('📋 Required Environment Variables:');
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    const status = value ? '✅' : '❌';
    const displayValue = envVar === 'JWT_SECRET' && value ? '***configured***' : (value || 'not set');
    console.log(`   ${status} ${envVar}: ${displayValue}`);
  });
  console.log();
  
  console.log('📋 Optional Environment Variables:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log();
}

function showTroubleshooting() {
  console.log('🔧 Troubleshooting Guide\n');
  console.log('=' .repeat(80));
  console.log();
  
  console.log('📋 Common Issues:');
  console.log();
  
  console.log('❌ "No response from service"');
  console.log('   • Check if target service is running');
  console.log('   • Verify service URL in environment variables');
  console.log('   • Check network connectivity');
  console.log();
  
  console.log('❌ "Invalid token" / "Access denied"');
  console.log('   • Verify JWT_SECRET matches across services');
  console.log('   • Check token format (Bearer <token>)');
  console.log('   • Ensure token is not expired');
  console.log();
  
  console.log('❌ "Proxy error"');
  console.log('   • Check proxy timeout settings');
  console.log('   • Verify path rewriting configuration');
  console.log('   • Check service health endpoints');
  console.log();
  
  console.log('📋 Debug Steps:');
  console.log('   1. Set NODE_ENV=development for detailed logs');
  console.log('   2. Check API Gateway logs for proxy errors');
  console.log('   3. Test individual services directly');
  console.log('   4. Verify environment variables');
  console.log('   5. Check CORS configuration');
  console.log();
}

// Run all checks
console.log('🚀 API Gateway Configuration Test\n');
console.log('=' .repeat(80));
console.log();

showEnvironmentCheck();
showRouteMapping();
showAuthenticationFlow();
showProxyConfiguration();
showTroubleshooting();

console.log('✅ Configuration test completed!');
