# Hướng dẫn sử dụng VAPI trực tiếp với Web Token

## Giới thiệu

Tài liệu này hướng dẫn cách sử dụng VAPI trực tiếp thông qua NEXT_PUBLIC_VAPI_WEB_TOKEN mà không cần sử dụng workflow ID. Phương pháp này cho phép bạn tương tác trực tiếp với API của VAPI để tạo và quản lý các cuộc gọi.

## Cài đặt

Đầu tiên, cài đặt thư viện VAPI:

```bash
# Sử dụng npm
npm install @vapi-ai/web

# Hoặc sử dụng yarn
yarn add @vapi-ai/web

# Hoặc sử dụng pnpm
pnpm add @vapi-ai/web
```

## Khởi tạo VAPI với Web Token

Tạo một file SDK (ví dụ: `vapi.sdk.ts` hoặc `vapi.js`) để khởi tạo VAPI với token của bạn:

```typescript
import Vapi from "@vapi-ai/web";

// Khởi tạo VAPI với token của bạn
export const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);
```

Đảm bảo bạn đã thêm token vào biến môi trường của dự án. Đối với Next.js, thêm vào file `.env.local`:

```
NEXT_PUBLIC_VAPI_WEB_TOKEN=your_vapi_web_token_here
```

## Sử dụng VAPI trực tiếp (không cần workflow ID)

### 1. Tạo Assistant trực tiếp trong code

Thay vì sử dụng workflow ID, bạn có thể tạo và cấu hình assistant trực tiếp trong code:

```typescript
import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";

// Định nghĩa assistant
const myAssistant: CreateAssistantDTO = {
  name: "My Assistant",
  firstMessage: "Xin chào! Tôi có thể giúp gì cho bạn?",
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "vi", // Ngôn ngữ: tiếng Việt
  },
  voice: {
    provider: "11labs",
    voiceId: "sarah", // ID giọng nói
    stability: 0.4,
    similarityBoost: 0.8,
    speed: 0.9,
    style: 0.5,
    useSpeakerBoost: true,
  },
  model: {
    provider: "openai",
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `Bạn là một trợ lý AI thông minh và thân thiện. Hãy giúp đỡ người dùng một cách tốt nhất.
        
        Hướng dẫn:
        - Luôn lịch sự và chuyên nghiệp
        - Trả lời ngắn gọn và rõ ràng
        - Đây là cuộc trò chuyện bằng giọng nói, vì vậy hãy giữ câu trả lời ngắn gọn
        - Sử dụng ngôn ngữ tự nhiên, thân thiện`,
      },
    ],
  },
};
```

### 2. Bắt đầu cuộc gọi với assistant đã định nghĩa

Sau khi định nghĩa assistant, bạn có thể bắt đầu cuộc gọi trực tiếp với assistant đó:

```typescript
// Trong component của bạn
const handleCall = async () => {
  setCallStatus(CallStatus.CONNECTING);
  
  // Bắt đầu cuộc gọi với assistant đã định nghĩa
  await vapi.start(myAssistant);
};
```

### 3. Ví dụ component đầy đủ

```tsx
import { useState, useEffect } from "react";
import { vapi } from "@/lib/vapi.sdk"; // Đường dẫn đến file SDK của bạn
import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";

// Định nghĩa trạng thái cuộc gọi
enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

// Định nghĩa kiểu tin nhắn đã lưu
interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

// Định nghĩa assistant
const myAssistant: CreateAssistantDTO = {
  name: "My Assistant",
  firstMessage: "Xin chào! Tôi có thể giúp gì cho bạn?",
  transcriber: {
    provider: "deepgram",
    model: "nova-2",
    language: "vi", // Ngôn ngữ: tiếng Việt
  },
  voice: {
    provider: "11labs",
    voiceId: "sarah", // ID giọng nói
    stability: 0.4,
    similarityBoost: 0.8,
    speed: 0.9,
    style: 0.5,
    useSpeakerBoost: true,
  },
  model: {
    provider: "openai",
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `Bạn là một trợ lý AI thông minh và thân thiện. Hãy giúp đỡ người dùng một cách tốt nhất.
        
        Hướng dẫn:
        - Luôn lịch sự và chuyên nghiệp
        - Trả lời ngắn gọn và rõ ràng
        - Đây là cuộc trò chuyện bằng giọng nói, vì vậy hãy giữ câu trả lời ngắn gọn
        - Sử dụng ngôn ngữ tự nhiên, thân thiện`,
      },
    ],
  },
};

const DirectVapiComponent = () => {
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Xử lý sự kiện khi cuộc gọi bắt đầu
    const onCallStart = () => {
      setCallStatus(CallStatus.ACTIVE);
    };

    // Xử lý sự kiện khi cuộc gọi kết thúc
    const onCallEnd = () => {
      setCallStatus(CallStatus.FINISHED);
    };

    // Xử lý sự kiện khi nhận được tin nhắn
    const onMessage = (message: Message) => {
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    // Xử lý sự kiện khi AI bắt đầu nói
    const onSpeechStart = () => {
      setIsSpeaking(true);
    };

    // Xử lý sự kiện khi AI ngừng nói
    const onSpeechEnd = () => {
      setIsSpeaking(false);
    };

    // Xử lý sự kiện khi có lỗi
    const onError = (error: Error) => {
      console.log("Error:", error);
    };

    // Đăng ký các sự kiện
    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    // Hủy đăng ký các sự kiện khi component unmount
    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
    };
  }, []);

  // Hàm bắt đầu cuộc gọi
  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);
    
    // Bắt đầu cuộc gọi với assistant đã định nghĩa
    await vapi.start(myAssistant);
  };

  // Hàm kết thúc cuộc gọi
  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  return (
    <div>
      <div>
        {/* Hiển thị trạng thái cuộc gọi và tin nhắn */}
        {messages.map((message, index) => (
          <div key={index}>
            <strong>{message.role}:</strong> {message.content}
          </div>
        ))}
      </div>

      <div>
        {/* Nút điều khiển cuộc gọi */}
        {callStatus !== CallStatus.ACTIVE ? (
          <button onClick={handleCall}>
            {callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED
              ? "Gọi"
              : "Đang kết nối..."}
          </button>
        ) : (
          <button onClick={handleDisconnect}>
            Kết thúc
          </button>
        )}
      </div>
    </div>
  );
};

export default DirectVapiComponent;
```

## Truyền biến vào assistant (nếu cần)

Nếu bạn cần truyền biến vào assistant, bạn vẫn có thể sử dụng `variableValues`:

```typescript
// Bắt đầu cuộc gọi với assistant đã định nghĩa và các biến
await vapi.start(myAssistant, {
  variableValues: {
    username: "User Name",
    // Các biến khác...
  },
});
```

## Sử dụng biến trong nội dung system message

Bạn có thể sử dụng cú pháp `{{variable_name}}` trong nội dung system message để tham chiếu đến các biến:

```typescript
const myAssistant: CreateAssistantDTO = {
  // ... các cấu hình khác ...
  model: {
    provider: "openai",
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: `Xin chào {{username}}! Bạn là một trợ lý AI thông minh và thân thiện.
        
        Thông tin người dùng:
        - Tên: {{username}}
        - ID: {{userid}}
        
        Hướng dẫn:
        - Luôn lịch sự và chuyên nghiệp
        - Trả lời ngắn gọn và rõ ràng`,
      },
    ],
  },
};

// Khi bắt đầu cuộc gọi
await vapi.start(myAssistant, {
  variableValues: {
    username: "Nguyễn Văn A",
    userid: "user123",
  },
});
```

## Tùy chỉnh các tham số khác

Bạn có thể tùy chỉnh nhiều tham số khác trong assistant:

```typescript
const myAssistant: CreateAssistantDTO = {
  name: "My Assistant",
  firstMessage: "Xin chào! Tôi có thể giúp gì cho bạn?",
  
  // Cấu hình transcriber (chuyển đổi giọng nói thành văn bản)
  transcriber: {
    provider: "deepgram", // Hoặc "assembly", "whisper"
    model: "nova-2",
    language: "vi",
    // Các tùy chọn khác...
  },
  
  // Cấu hình voice (giọng nói)
  voice: {
    provider: "11labs", // Hoặc "azure", "deepgram", "play.ht"
    voiceId: "sarah",
    stability: 0.4, // 0-1
    similarityBoost: 0.8, // 0-1
    speed: 0.9, // 0-1
    style: 0.5, // 0-1
    useSpeakerBoost: true,
  },
  
  // Cấu hình model (mô hình AI)
  model: {
    provider: "openai", // Hoặc "anthropic", "azure", "cohere"
    model: "gpt-4", // Hoặc "gpt-3.5-turbo", "claude-3-opus", v.v.
    messages: [
      // System messages...
    ],
    // Các tùy chọn khác...
  },
};
```

## Kết luận

Với phương pháp này, bạn có thể sử dụng VAPI trực tiếp thông qua NEXT_PUBLIC_VAPI_WEB_TOKEN mà không cần sử dụng workflow ID. Điều này cho phép bạn có nhiều quyền kiểm soát hơn đối với cấu hình của assistant và cách nó hoạt động.

Lưu ý rằng phương pháp này yêu cầu bạn định nghĩa đầy đủ cấu hình của assistant trong code, nhưng cũng mang lại sự linh hoạt cao hơn trong việc tùy chỉnh trải nghiệm người dùng.

## Tài nguyên bổ sung

- [VAPI Documentation](https://docs.vapi.ai/)
- [VAPI API Reference](https://docs.vapi.ai/reference/api)
- [VAPI GitHub](https://github.com/vapi-ai)
- [VAPI Dashboard](https://dashboard.vapi.ai/)
