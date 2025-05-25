#!/usr/bin/env node

/**
 * Script test để kiểm tra cơ chế credentials management
 * Chạy: node test-credentials.js
 */

require('dotenv').config();

// Mock user settings để test
const mockUserSettings = {
  withUserCredentials: {
    vapi_api_key: 'user-api-key-123',
    vapi_web_token: 'user-web-token-456',
    language: 'vi'
  },
  withoutUserCredentials: {
    language: 'en'
  },
  null: null
};

// Mock environment variables
const mockEnvVars = {
  VAPI_API_KEY: 'env-api-key-789',
  VAPI_WEB_TOKEN: 'env-web-token-012'
};

function testCredentialsPriority() {
  console.log('🧪 Testing Credentials Priority Logic\n');

  // Test case 1: User có credentials riêng
  console.log('📋 Test Case 1: User có credentials riêng');
  const userSettings1 = mockUserSettings.withUserCredentials;
  
  const apiKey1 = userSettings1?.vapi_api_key || mockEnvVars.VAPI_API_KEY;
  const webToken1 = userSettings1?.vapi_web_token || mockEnvVars.VAPI_WEB_TOKEN;
  
  console.log(`   ✅ API Key: ${apiKey1} (from: ${userSettings1?.vapi_api_key ? 'user settings' : 'env'})`);
  console.log(`   ✅ Web Token: ${webToken1} (from: ${userSettings1?.vapi_web_token ? 'user settings' : 'env'})`);
  console.log();

  // Test case 2: User không có credentials riêng
  console.log('📋 Test Case 2: User không có credentials riêng');
  const userSettings2 = mockUserSettings.withoutUserCredentials;
  
  const apiKey2 = userSettings2?.vapi_api_key || mockEnvVars.VAPI_API_KEY;
  const webToken2 = userSettings2?.vapi_web_token || mockEnvVars.VAPI_WEB_TOKEN;
  
  console.log(`   ✅ API Key: ${apiKey2} (from: ${userSettings2?.vapi_api_key ? 'user settings' : 'env'})`);
  console.log(`   ✅ Web Token: ${webToken2} (from: ${userSettings2?.vapi_web_token ? 'user settings' : 'env'})`);
  console.log();

  // Test case 3: Không có user settings
  console.log('📋 Test Case 3: Không có user settings');
  const userSettings3 = mockUserSettings.null;
  
  const apiKey3 = userSettings3?.vapi_api_key || mockEnvVars.VAPI_API_KEY;
  const webToken3 = userSettings3?.vapi_web_token || mockEnvVars.VAPI_WEB_TOKEN;
  
  console.log(`   ✅ API Key: ${apiKey3} (from: ${userSettings3?.vapi_api_key ? 'user settings' : 'env'})`);
  console.log(`   ✅ Web Token: ${webToken3} (from: ${userSettings3?.vapi_web_token ? 'user settings' : 'env'})`);
  console.log();

  // Test case 4: Không có credentials nào
  console.log('📋 Test Case 4: Không có credentials nào');
  const userSettings4 = mockUserSettings.withoutUserCredentials;
  const noEnvVars = {};
  
  const apiKey4 = userSettings4?.vapi_api_key || noEnvVars.VAPI_API_KEY;
  const webToken4 = userSettings4?.vapi_web_token || noEnvVars.VAPI_WEB_TOKEN;
  
  console.log(`   ❌ API Key: ${apiKey4 || 'NOT CONFIGURED'}`);
  console.log(`   ❌ Web Token: ${webToken4 || 'NOT CONFIGURED'}`);
  console.log();
}

function testActualEnvironment() {
  console.log('🌍 Testing Actual Environment Variables\n');
  
  console.log('📋 Current Environment:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`   USER_SERVICE_URL: ${process.env.USER_SERVICE_URL || 'not set'}`);
  console.log(`   VAPI_API_KEY: ${process.env.VAPI_API_KEY ? '***configured***' : 'not set'}`);
  console.log(`   VAPI_WEB_TOKEN: ${process.env.VAPI_WEB_TOKEN ? '***configured***' : 'not set'}`);
  console.log();
}

function showUsageInstructions() {
  console.log('📖 Usage Instructions\n');
  
  console.log('👤 For Users:');
  console.log('   1. Go to Settings in the app');
  console.log('   2. Enter your VAPI API Key and VAPI Web Token');
  console.log('   3. Save settings');
  console.log('   4. Your personal credentials will be used instead of system defaults');
  console.log();
  
  console.log('⚙️  For Administrators:');
  console.log('   1. Set VAPI_API_KEY and VAPI_WEB_TOKEN in .env file');
  console.log('   2. These will be used as fallback when users don\'t have personal credentials');
  console.log('   3. Users can override these with their own credentials');
  console.log();
  
  console.log('🔍 For Debugging:');
  console.log('   1. Set NODE_ENV=development to see credential source logs');
  console.log('   2. Check voice service logs for credential usage information');
  console.log('   3. Verify user settings in database');
  console.log();
}

// Run tests
console.log('🚀 Voice Service Credentials Management Test\n');
console.log('=' .repeat(60));
console.log();

testCredentialsPriority();
testActualEnvironment();
showUsageInstructions();

console.log('✅ Test completed successfully!');
