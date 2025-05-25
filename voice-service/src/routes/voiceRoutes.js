const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');
const { verifyToken } = require('../middleware/auth');

// Tất cả các routes đều yêu cầu xác thực
router.use(verifyToken);

// Lấy thông tin cấu hình VAPI
router.get('/config', voiceController.getVapiConfig);

// Lấy VAPI Web Token cho frontend
router.get('/web-token', voiceController.getVapiWebToken);

// Tạo cuộc gọi mới
router.post('/calls', voiceController.createCall);

// Lấy thông tin cuộc gọi
router.get('/calls/:callId', voiceController.getCallById);

// Cập nhật trạng thái cuộc gọi
router.put('/calls/:callId', voiceController.updateCallStatus);

// Kết thúc cuộc gọi
router.delete('/calls/:callId', voiceController.endCall);

// Lấy lịch sử cuộc gọi của người dùng
router.get('/history', voiceController.getCallHistory);

module.exports = router;
