"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { Loader2, Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { userAPI, isAuthenticated } from "@/lib/api";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { initVapi, getVapi, getAssistant, CallStatus, Message, MessageTypeEnum, TranscriptMessageTypeEnum, SavedMessage } from "@/lib/vapi.sdk";
import { CircularAudioWave } from "@/components/ui/audio-wave";
import { RandomVideo } from "@/components/ui/random-video";

export default function VoiceChat() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isMicActive, setIsMicActive] = useState(false);
    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
    const [messages, setMessages] = useState<SavedMessage[]>([]);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [vapiInstance, setVapiInstance] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // Logo component
    const Logo = () => {
        return (
            <div className="flex items-center gap-2">
                <span className="font-bold text-xl text-white">Serna</span>
            </div>
        );
    };

    useEffect(() => {
        const checkUser = async () => {
            console.log("Checking user session in voice chat...");

            try {
                if (!isAuthenticated()) {
                    console.log("No auth token found, redirecting to signin...");
                    router.push("/signin");
                    return;
                }

                try {
                    const { profile } = await userAPI.getProfile();
                    console.log("User profile loaded successfully");

                    if (profile) {
                        setUser({
                            id: profile.id,
                            email: profile.email,
                            full_name: profile.full_name,
                            avatar_url: profile.avatar_url,
                        });
                    }

                    // Khởi tạo VAPI
                    const vapi = await initVapi();
                    if (vapi) {
                        setVapiInstance(vapi);
                        console.log("VAPI initialized successfully");
                    } else {
                        console.error("Failed to initialize VAPI");
                    }

                    setLoading(false);
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                    localStorage.removeItem("auth_token");
                    router.push("/signin");
                }
            } catch (error) {
                console.error("Exception in checkUser:", error);
                setLoading(false);
                router.push("/signin");
            }
        };

        checkUser();
    }, [router]);

    const toggleMic = () => {
        setIsMicActive(!isMicActive);
    };

    const toggleCall = async () => {
        try {
            if (callStatus === CallStatus.ACTIVE) {
                setCallStatus(CallStatus.FINISHED);
                // Dừng cuộc gọi VAPI
                if (vapiInstance) {
                    vapiInstance.stop();
                }
                // Không cần gọi API để kết thúc cuộc gọi trên server
            } else {
                setCallStatus(CallStatus.CONNECTING);
                // Không cần tạo cuộc gọi mới trên server
                // Khởi tạo cuộc gọi VAPI trực tiếp
                handleCall();
            }
        } catch (error: any) {
            console.error("Error toggling call:", error);
            setError("Có lỗi xảy ra khi kết nối cuộc gọi: " + (error.message || "Lỗi không xác định"));
            setCallStatus(CallStatus.INACTIVE);
        }
    };

    // Hàm bắt đầu cuộc gọi
    const handleCall = async () => {
        try {
            // Nếu chưa khởi tạo VAPI, khởi tạo lại
            if (!vapiInstance) {
                console.log("Initializing VAPI...");
                const vapi = await initVapi();
                if (vapi) {
                    setVapiInstance(vapi);
                } else {
                    throw new Error("Failed to initialize VAPI");
                }
            }

            // Đăng ký các sự kiện
            console.log("Registering VAPI event handlers...");

            vapiInstance.on("call-start", () => {
                console.log("Call started");
                setCallStatus(CallStatus.ACTIVE);
                // Không cần cập nhật trạng thái cuộc gọi trên server
            });

            vapiInstance.on("call-end", () => {
                console.log("Call ended");
                setCallStatus(CallStatus.FINISHED);
                // Không cần cập nhật trạng thái cuộc gọi trên server
            });

            vapiInstance.on("message", (message: Message) => {
                if (message.type === MessageTypeEnum.TRANSCRIPT &&
                    message.transcriptType === TranscriptMessageTypeEnum.FINAL) {
                    console.log("Received message:", message);
                    const newMessage = {
                        role: message.role,
                        content: message.transcript
                    };
                    setMessages((prev) => [...prev, newMessage]);
                }
            });

            vapiInstance.on("speech-start", () => {
                console.log("Speech started");
                setIsSpeaking(true);
            });

            vapiInstance.on("speech-end", () => {
                console.log("Speech ended");
                setIsSpeaking(false);
            });

            vapiInstance.on("error", (error: any) => {
                console.error("VAPI error:", error);
                setError("Có lỗi xảy ra trong cuộc gọi: " + (error.message || "Lỗi không xác định"));
            });

            // Lấy assistant từ backend
            console.log("Getting assistant configuration...");
            const assistant = getAssistant();
            if (!assistant) {
                throw new Error("Failed to get assistant configuration");
            }

            // Bắt đầu cuộc gọi với assistant đã định nghĩa
            console.log("Starting call with assistant:", assistant.name);
            await vapiInstance.start(assistant);

        } catch (error: any) {
            console.error("Error starting call:", error);
            setError("Có lỗi xảy ra khi bắt đầu cuộc gọi: " + (error.message || "Lỗi không xác định"));
            setCallStatus(CallStatus.INACTIVE);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background relative text-white flex flex-col">
            {/* Background image */}
            <div className="absolute inset-0 w-full h-full overflow-hidden">
                <div
                    className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: 'url("/bg2.png")',
                        opacity: 1,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center center',
                        backgroundRepeat: 'no-repeat'
                    }}
                />
            </div>

            {/* Navigation bar */}
            <nav className="relative z-50 w-full px-4 py-3 flex items-center justify-between">
                <div className="flex items-center">
                    <Logo />
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="px-4 py-2 rounded-lg text-sm text-zinc-200 transition-colors border border-white/10 hover:border-white/20 hover:bg-white/5">
                        Quay lại Chat
                    </Link>
                    <UserProfileDropdown user={user} />
                </div>
            </nav>

            {/* Voice Chat Interface */}
            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                <div className="max-w-2xl w-full mx-auto flex flex-col items-center">
                    {/* Voice Chat Image with Enhanced Audio Wave Effect */}
                    <div className="relative flex items-center justify-center mb-8">
                        {/* Hiệu ứng nhịp tim chính */}
                        <div className="absolute -inset-20 z-0 pointer-events-none flex items-center justify-center">
                            <CircularAudioWave
                                isActive={isSpeaking}
                                color="#ff5e7a"
                                size={600}
                            />
                        </div>

                        {/* Hiệu ứng nhịp tim thứ hai - tạo hiệu ứng đa lớp */}
                        <div className="absolute -inset-16 z-0 pointer-events-none flex items-center justify-center">
                            <CircularAudioWave
                                isActive={isSpeaking}
                                color="#ff8fa3"
                                size={550}
                            />
                        </div>

                        {/* Video ngẫu nhiên với hiệu ứng phát sáng khi đang nói */}
                        <motion.div
                            className={`w-64 h-64 md:w-80 md:h-80 relative rounded-lg overflow-hidden z-10 ${isSpeaking ? 'shadow-glow' : ''}`}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                            style={{
                                boxShadow: isSpeaking
                                    ? '0 0 20px 5px rgba(255, 94, 122, 0.3), 0 0 40px 10px rgba(255, 143, 163, 0.2)'
                                    : '0 0 10px rgba(255, 255, 255, 0.1)',
                                border: '4px solid rgba(255, 255, 255, 0.2)',
                                transition: 'box-shadow 0.5s ease'
                            }}
                        >
                            <RandomVideo
                                isActive={isSpeaking}
                            />
                        </motion.div>
                    </div>

                    {/* Status Text - Chỉ hiển thị trạng thái cuộc gọi và lỗi */}
                    <motion.div
                        className="text-center mb-8"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                    >
                        {/* Chỉ hiển thị trạng thái khi đang kết nối hoặc đang gọi */}
                        {(callStatus === CallStatus.ACTIVE || callStatus === CallStatus.CONNECTING) && (
                            <p className="text-white/80 text-lg font-medium">
                                {callStatus === CallStatus.ACTIVE
                                    ? "Cuộc gọi đang hoạt động"
                                    : "Đang kết nối..."}
                            </p>
                        )}
                        {error && (
                            <p className="text-red-400 mt-2 text-sm">
                                {error}
                            </p>
                        )}
                    </motion.div>

                    {/* Enhanced Control Buttons - Đã điều chỉnh kích thước và khoảng cách */}
                    <motion.div
                        className="flex items-center justify-center gap-12 mt-16"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.5 }}
                    >
                        {/* Nút Mic được thiết kế lại - Kích thước đã điều chỉnh */}
                        <motion.button
                            onClick={toggleMic}
                            className={cn(
                                "relative group flex items-center justify-center transition-all",
                                "w-18 h-18 rounded-xl backdrop-blur-md",
                                isMicActive
                                    ? "bg-gradient-to-br from-emerald-400/80 to-emerald-600/80 shadow-lg shadow-emerald-500/30"
                                    : "bg-gradient-to-br from-zinc-700/80 to-zinc-800/80 shadow-lg shadow-zinc-900/30"
                            )}
                            style={{ width: '70px', height: '70px' }} // Đảm bảo kích thước cố định
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                            {isMicActive ? (
                                <Mic className="w-8 h-8 text-white drop-shadow-md" />
                            ) : (
                                <MicOff className="w-8 h-8 text-white/90 drop-shadow-md" />
                            )}
                        </motion.button>

                        {/* Nút Gọi được thiết kế lại */}
                        <motion.button
                            onClick={toggleCall}
                            className={cn(
                                "relative group flex items-center justify-center transition-all",
                                "rounded-xl backdrop-blur-md",
                                callStatus === CallStatus.ACTIVE
                                    ? "bg-gradient-to-br from-rose-500/80 to-rose-700/80 shadow-lg shadow-rose-500/30"
                                    : "bg-gradient-to-br from-blue-400/80 to-indigo-600/80 shadow-lg shadow-blue-500/30"
                            )}
                            style={{ width: '70px', height: '70px' }} // Đảm bảo kích thước cố định
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></span>
                            {callStatus === CallStatus.ACTIVE ? (
                                <PhoneOff className="w-8 h-8 text-white drop-shadow-md" />
                            ) : (
                                <Phone className="w-8 h-8 text-white drop-shadow-md" />
                            )}

                            {/* Hiệu ứng pulse khi không trong cuộc gọi */}
                            {callStatus !== CallStatus.ACTIVE && (
                                <span className="absolute inset-0 rounded-xl animate-pulse bg-white/10"></span>
                            )}
                        </motion.button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
