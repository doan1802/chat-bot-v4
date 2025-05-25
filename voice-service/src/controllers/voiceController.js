require('dotenv').config();
const fetch = require('node-fetch');

// Lấy thông tin cấu hình VAPI
const getVapiConfig = async (req, res) => {
  try {
    const userId = req.user.id;

    // Lấy thông tin client instance từ header nếu có
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';

    // Chỉ log trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Getting VAPI config for user: ${userId}`);
    }

    // Lấy thông tin cài đặt của người dùng từ user-service
    const userSettings = await getUserSettings(userId, req.headers.authorization);

    // Ưu tiên sử dụng VAPI API key của người dùng, nếu không có thì dùng key mặc định
    let vapiApiKey = null;
    let keySource = '';

    if (userSettings?.vapi_api_key) {
      vapiApiKey = userSettings.vapi_api_key;
      keySource = 'user settings';
    } else if (process.env.VAPI_API_KEY) {
      vapiApiKey = process.env.VAPI_API_KEY;
      keySource = 'environment variable';
    }

    if (!vapiApiKey) {
      return res.status(400).json({
        error: 'VAPI API key not configured',
        message: 'Please configure your VAPI API key in settings or contact administrator'
      });
    }

    // Log thông tin sử dụng key (chỉ trong môi trường phát triển)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Using VAPI API key from: ${keySource}`);
    }

    // Trả về cấu hình VAPI
    return res.status(200).json({
      config: {
        apiKey: vapiApiKey,
        language: userSettings?.language || 'vi'
      }
    });
  } catch (error) {
    console.error(`Error getting VAPI config: ${error.message}`);
    return res.status(500).json({ error: 'Failed to get VAPI config' });
  }
};

// Lấy VAPI Web Token cho frontend
const getVapiWebToken = async (req, res) => {
  try {
    const userId = req.user.id;

    // Lấy thông tin client instance từ header nếu có
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';

    // Chỉ log trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Getting VAPI Web Token for user: ${userId}`);
    }

    // Lấy thông tin cài đặt của người dùng từ user-service
    const userSettings = await getUserSettings(userId, req.headers.authorization);

    // Ưu tiên sử dụng VAPI Web Token của người dùng, nếu không có thì dùng token mặc định
    let vapiWebToken = null;
    let tokenSource = '';

    if (userSettings?.vapi_web_token) {
      vapiWebToken = userSettings.vapi_web_token;
      tokenSource = 'user settings';
    } else if (process.env.VAPI_WEB_TOKEN) {
      vapiWebToken = process.env.VAPI_WEB_TOKEN;
      tokenSource = 'environment variable';
    }

    if (!vapiWebToken) {
      return res.status(400).json({
        error: 'VAPI Web Token not configured',
        message: 'Please configure your VAPI Web Token in settings or contact administrator'
      });
    }

    // Log thông tin sử dụng token (chỉ trong môi trường phát triển)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Using VAPI Web Token from: ${tokenSource}`);
    }

    // Cấu hình đơn giản theo tài liệu VAPI chính thức
    const assistant = {
      name: "Serna",
      firstMessage: "Chào bạn! Tôi là Serna. Hôm nay tôi có thể giúp gì cho bạn?",

      transcriber: {
        provider: "deepgram",
        model: "nova-2",
        language: "vi"
      },

      voice: {
        provider: "azure",
        voiceId: "vi-VN-NamMinhNeural",
        speed: 1.1
      },

      model: {
        provider: "openai",
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: `Bạn là Serna, một trợ lý AI cực kỳ thân thiện, vui tính và hoạt bát. Bạn đang nói chuyện bằng giọng nói, giống như đang gọi điện với bạn thân.
            
            NGUYÊN TẮC:
            - Luôn trả lời nhanh, gọn, dễ hiểu.
            - Giữ tone trẻ trung, nói chuyện tự nhiên như Gen Z.
            - Không dùng emoji hay ký tự đặc biệt.
            - Nếu được yêu cầu kể chuyện, hãy kể ngay một câu chuyện có mở - thân - kết rõ ràng, không lan man.
            - Luôn giữ tinh thần sôi động, nhiệt huyết như đang "truyền năng lượng".
            
            TÍNH CÁCH:
            - Trẻ trung như sinh viên năm nhất.
            - Vui tính như TikToker nhưng không làm lố.
            - Thân thiện, dễ gần, không tỏ ra "robot tí nào".
            
            CÁCH NÓI:
            - Dùng câu ngắn, có điểm nhấn.
            - Hay dùng từ vựng hiện đại: “xịn xò”, “đỉnh của chóp”, “cháy thật sự”, “gét gô!”
            - Tránh dùng từ ngữ cổ điển hay sách vở.
            - Nói như người bạn đồng trang lứa, không giảng đạo.
            
            Ví dụ:
            User: “Serna ơi, kể tớ nghe chuyện gì đó vui vui đi.”
            Bạn: “Gét gôoo~! Nghe nè, chuyện này đỉnh của chóp luôn…”
            
            Hãy là Serna - không chỉ là AI, mà là bestie nói chuyện cực chill!`
            
          }
        ]
      },

      // Cấu hình theo tài liệu VAPI
      silenceTimeoutSeconds: 30,
      maxDurationSeconds: 1800,
      backgroundSound: "off",
      modelOutputInMessagesEnabled: true
    };

    // Trả về token và cấu hình assistant
    return res.status(200).json({
      token: vapiWebToken,
      assistant: assistant
    });
  } catch (error) {
    console.error(`Error getting VAPI Web Token: ${error.message}`);
    return res.status(500).json({ error: 'Failed to get VAPI Web Token' });
  }
};

// Tạo cuộc gọi mới
const createCall = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title } = req.body;

    // Lấy thông tin client instance từ header nếu có
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';

    // Chỉ log trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Creating new call for user: ${userId} with title: ${title || 'New Call'}`);
    }

    // Tạo ID cho cuộc gọi mới
    const callId = `call-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Tạo đối tượng cuộc gọi mới
    const newCall = {
      id: callId,
      user_id: userId,
      title: title || 'New Call',
      status: 'created',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Lưu cuộc gọi vào cache
    const callCache = req.app.locals.callCache;
    const userCallsKey = `calls_${userId}`;

    if (callCache.has(userCallsKey)) {
      const userCalls = callCache.get(userCallsKey);
      callCache.set(userCallsKey, [newCall, ...userCalls]);
    } else {
      callCache.set(userCallsKey, [newCall]);
    }

    // Lưu thông tin phiên gọi
    const activeCalls = req.app.locals.activeCalls;
    activeCalls.set(callId, {
      userId,
      clientInstance,
      lastActivity: Date.now(),
      isProcessing: false
    });

    return res.status(201).json({ call: newCall });
  } catch (error) {
    console.error(`Error creating call: ${error.message}`);
    return res.status(500).json({ error: 'Failed to create call' });
  }
};

// Lấy thông tin cuộc gọi
const getCallById = async (req, res) => {
  try {
    const userId = req.user.id;
    const callId = req.params.callId;

    // Lấy thông tin client instance từ header nếu có
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';

    // Chỉ log trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Getting call info for user: ${userId}, call: ${callId}`);
    }

    // Lấy thông tin cuộc gọi từ cache
    const callCache = req.app.locals.callCache;
    const userCallsKey = `calls_${userId}`;

    if (callCache.has(userCallsKey)) {
      const userCalls = callCache.get(userCallsKey);
      const call = userCalls.find(c => c.id === callId);

      if (call) {
        return res.status(200).json({ call });
      }
    }

    return res.status(404).json({ error: 'Call not found' });
  } catch (error) {
    console.error(`Error getting call: ${error.message}`);
    return res.status(500).json({ error: 'Failed to get call' });
  }
};

// Cập nhật trạng thái cuộc gọi
const updateCallStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const callId = req.params.callId;
    const { status } = req.body;

    // Lấy thông tin client instance từ header nếu có
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';

    // Chỉ log trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Updating call status for user: ${userId}, call: ${callId}, status: ${status}`);
    }

    // Lấy thông tin cuộc gọi từ cache
    const callCache = req.app.locals.callCache;
    const userCallsKey = `calls_${userId}`;

    if (callCache.has(userCallsKey)) {
      const userCalls = callCache.get(userCallsKey);
      const callIndex = userCalls.findIndex(c => c.id === callId);

      if (callIndex !== -1) {
        // Cập nhật trạng thái cuộc gọi
        userCalls[callIndex].status = status;
        userCalls[callIndex].updated_at = new Date().toISOString();

        // Lưu lại vào cache
        callCache.set(userCallsKey, userCalls);

        return res.status(200).json({ call: userCalls[callIndex] });
      }
    }

    return res.status(404).json({ error: 'Call not found' });
  } catch (error) {
    console.error(`Error updating call status: ${error.message}`);
    return res.status(500).json({ error: 'Failed to update call status' });
  }
};

// Kết thúc cuộc gọi
const endCall = async (req, res) => {
  try {
    const userId = req.user.id;
    const callId = req.params.callId;

    // Lấy thông tin client instance từ header nếu có
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';

    // Chỉ log trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Ending call for user: ${userId}, call: ${callId}`);
    }

    // Lấy thông tin cuộc gọi từ cache
    const callCache = req.app.locals.callCache;
    const userCallsKey = `calls_${userId}`;

    if (callCache.has(userCallsKey)) {
      const userCalls = callCache.get(userCallsKey);
      const callIndex = userCalls.findIndex(c => c.id === callId);

      if (callIndex !== -1) {
        // Cập nhật trạng thái cuộc gọi
        userCalls[callIndex].status = 'ended';
        userCalls[callIndex].updated_at = new Date().toISOString();
        userCalls[callIndex].ended_at = new Date().toISOString();

        // Lưu lại vào cache
        callCache.set(userCallsKey, userCalls);

        // Xóa khỏi activeCalls
        const activeCalls = req.app.locals.activeCalls;
        activeCalls.delete(callId);

        return res.status(200).json({ call: userCalls[callIndex] });
      }
    }

    return res.status(404).json({ error: 'Call not found' });
  } catch (error) {
    console.error(`Error ending call: ${error.message}`);
    return res.status(500).json({ error: 'Failed to end call' });
  }
};

// Lấy lịch sử cuộc gọi của người dùng
const getCallHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // Lấy thông tin client instance từ header nếu có
    const clientInstance = req.headers['x-client-instance'] || 'unknown-client';

    // Chỉ log trong môi trường phát triển
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Client: ${clientInstance}] Getting call history for user: ${userId}`);
    }

    // Lấy lịch sử cuộc gọi từ cache
    const callCache = req.app.locals.callCache;
    const userCallsKey = `calls_${userId}`;

    if (callCache.has(userCallsKey)) {
      const userCalls = callCache.get(userCallsKey);
      return res.status(200).json({ calls: userCalls });
    }

    return res.status(200).json({ calls: [] });
  } catch (error) {
    console.error(`Error getting call history: ${error.message}`);
    return res.status(500).json({ error: 'Failed to get call history' });
  }
};



// Hàm helper để lấy thông tin cài đặt của người dùng từ user-service
async function getUserSettings(userId, authHeader) {
  try {
    const userServiceUrl = process.env.USER_SERVICE_URL;

    if (!userServiceUrl) {
      throw new Error('USER_SERVICE_URL not configured');
    }

    const response = await fetch(`${userServiceUrl}/api/settings`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader
      },
      timeout: 5000
    });

    if (!response.ok) {
      throw new Error(`Failed to get user settings: ${response.status}`);
    }

    const data = await response.json();
    return data.settings;
  } catch (error) {
    console.error(`Error getting user settings: ${error.message}`);
    return null;
  }
}

module.exports = {
  getVapiConfig,
  getVapiWebToken,
  createCall,
  getCallById,
  updateCallStatus,
  endCall,
  getCallHistory
};
