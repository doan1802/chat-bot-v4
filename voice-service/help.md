# Hướng dẫn kết nối với VAPI

## Giới thiệu

VAPI là một nền tảng cho phép tích hợp trợ lý AI có khả năng giao tiếp bằng giọng nói vào ứng dụng của bạn. Tài liệu này sẽ hướng dẫn bạn cách kết nối với VAPI trong dự án của mình.

## Cài đặt

Đầu tiên, bạn cần cài đặt thư viện VAPI cho dự án của mình:

```bash
# Sử dụng npm
npm install @vapi-ai/web

# Hoặc sử dụng yarn
yarn add @vapi-ai/web

# Hoặc sử dụng pnpm
pnpm add @vapi-ai/web
```

## Cấu hình cơ bản

### 1. Tạo file SDK

Tạo một file (ví dụ: `vapi.sdk.ts` hoặc `vapi.js`) để khởi tạo và xuất instance VAPI:

```typescript
import Vapi from "@vapi-ai/web";

// Khởi tạo VAPI với token của bạn
export const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);
```

Lưu ý: Bạn cần thêm token VAPI vào biến môi trường của dự án. Đối với Next.js, bạn có thể thêm vào file `.env.local`:

```
NEXT_PUBLIC_VAPI_WEB_TOKEN=your_vapi_web_token_here
```

### 2. Định nghĩa các kiểu dữ liệu (tùy chọn)

Nếu bạn sử dụng TypeScript, bạn có thể tạo file định nghĩa kiểu dữ liệu (ví dụ: `vapi.d.ts`):

```typescript
enum MessageTypeEnum {
  TRANSCRIPT = "transcript",
  FUNCTION_CALL = "function-call",
  FUNCTION_CALL_RESULT = "function-call-result",
  ADD_MESSAGE = "add-message",
}

enum MessageRoleEnum {
  USER = "user",
  SYSTEM = "system",
  ASSISTANT = "assistant",
}

enum TranscriptMessageTypeEnum {
  PARTIAL = "partial",
  FINAL = "final",
}

interface BaseMessage {
  type: MessageTypeEnum;
}

interface TranscriptMessage extends BaseMessage {
  type: MessageTypeEnum.TRANSCRIPT;
  role: MessageRoleEnum;
  transcriptType: TranscriptMessageTypeEnum;
  transcript: string;
}

interface FunctionCallMessage extends BaseMessage {
  type: MessageTypeEnum.FUNCTION_CALL;
  functionCall: {
    name: string;
    parameters: unknown;
  };
}

interface FunctionCallResultMessage extends BaseMessage {
  type: MessageTypeEnum.FUNCTION_CALL_RESULT;
  functionCallResult: {
    forwardToClientEnabled?: boolean;
    result: unknown;
    [a: string]: unknown;
  };
}

type Message =
  | TranscriptMessage
  | FunctionCallMessage
  | FunctionCallResultMessage;
```

## Sử dụng VAPI trong component

Dưới đây là ví dụ về cách sử dụng VAPI trong một component React:

```tsx
import { useState, useEffect } from "react";
import { vapi } from "@/lib/vapi.sdk"; // Đường dẫn đến file SDK của bạn

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

const VapiComponent = () => {
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
    
    // Bắt đầu cuộc gọi với workflow ID và các biến
    await vapi.start("your_workflow_id_here", {
      variableValues: {
        // Các biến cần thiết cho workflow
        username: "User Name",
        // Các biến khác...
      },
    });
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

export default VapiComponent;
```

## Tạo Assistant trong VAPI

Bạn có thể tạo một assistant với cấu hình tùy chỉnh:

```typescript
import { CreateAssistantDTO } from "@vapi-ai/web/dist/api";

export const myAssistant: CreateAssistantDTO = {
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

Sau đó, bạn có thể sử dụng assistant này trong hàm `vapi.start()`:

```typescript
await vapi.start(myAssistant, {
  variableValues: {
    // Các biến cần thiết (nếu có)
  },
});
```

## Kết luận

Trên đây là hướng dẫn cơ bản về cách kết nối với VAPI trong dự án của bạn. Để biết thêm thông tin chi tiết, vui lòng tham khảo [tài liệu chính thức của VAPI](https://docs.vapi.ai/).

## Tài nguyên bổ sung

- [VAPI Documentation](https://docs.vapi.ai/)
- [VAPI GitHub](https://github.com/vapi-ai)
- [VAPI Dashboard](https://dashboard.vapi.ai/)
