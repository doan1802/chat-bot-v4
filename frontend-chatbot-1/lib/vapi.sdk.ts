import Vapi from "@vapi-ai/web";
import type { CreateAssistantDTO } from "@vapi-ai/web/dist/api";
import { voiceAPI } from "@/lib/api";

// Biến lưu trữ instance VAPI
let vapiInstance: Vapi | null = null;

// Enum định nghĩa trạng thái cuộc gọi
export enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

// Enum định nghĩa loại tin nhắn
export enum MessageTypeEnum {
  TRANSCRIPT = "transcript",
  FUNCTION_CALL = "function-call",
  FUNCTION_CALL_RESULT = "function-call-result",
  ADD_MESSAGE = "add-message",
}

// Enum định nghĩa vai trò tin nhắn
export enum MessageRoleEnum {
  USER = "user",
  SYSTEM = "system",
  ASSISTANT = "assistant",
}

// Enum định nghĩa loại transcript
export enum TranscriptMessageTypeEnum {
  PARTIAL = "partial",
  FINAL = "final",
}

// Interface định nghĩa tin nhắn cơ bản
export interface BaseMessage {
  type: MessageTypeEnum;
}

// Interface định nghĩa tin nhắn transcript
export interface TranscriptMessage extends BaseMessage {
  type: MessageTypeEnum.TRANSCRIPT;
  role: MessageRoleEnum;
  transcriptType: TranscriptMessageTypeEnum;
  transcript: string;
}

// Interface định nghĩa tin nhắn function call
export interface FunctionCallMessage extends BaseMessage {
  type: MessageTypeEnum.FUNCTION_CALL;
  functionCall: {
    name: string;
    parameters: unknown;
  };
}

// Interface định nghĩa tin nhắn function call result
export interface FunctionCallResultMessage extends BaseMessage {
  type: MessageTypeEnum.FUNCTION_CALL_RESULT;
  functionCallResult: {
    forwardToClientEnabled?: boolean;
    result: unknown;
    [a: string]: unknown;
  };
}

// Type định nghĩa tin nhắn
export type Message =
  | TranscriptMessage
  | FunctionCallMessage
  | FunctionCallResultMessage;

// Interface định nghĩa tin nhắn đã lưu
export interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

// Hàm khởi tạo VAPI từ backend
export const initVapi = async (): Promise<Vapi | null> => {
  try {
    // Lấy token và cấu hình assistant từ backend
    const { token, assistant } = await voiceAPI.getVapiConfig();

    if (!token) {
      console.error("Failed to get VAPI token from backend");
      return null;
    }

    // Khởi tạo VAPI với token
    vapiInstance = new Vapi(token);

    // Lưu assistant vào biến toàn cục để sử dụng sau này
    if (assistant) {
      (window as any).__vapiAssistant = assistant;
    }

    // Ghi log các sự kiện VAPI để debug
    console.log("VAPI instance created with token:", token ? "***" : null);

    return vapiInstance;
  } catch (error) {
    console.error("Error initializing VAPI:", error);
    return null;
  }
};

// Hàm lấy instance VAPI đã khởi tạo
export const getVapi = async (): Promise<Vapi | null> => {
  if (!vapiInstance) {
    return await initVapi();
  }
  return vapiInstance;
};

// Hàm lấy assistant đã cấu hình
export const getAssistant = (): CreateAssistantDTO | null => {
  if (typeof window !== 'undefined' && (window as any).__vapiAssistant) {
    return (window as any).__vapiAssistant;
  }
  return null;
};
