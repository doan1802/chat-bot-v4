"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface RandomVideoProps {
  className?: string;
  onVideoEnd?: () => void;
  isActive?: boolean; // Trạng thái đang nói hay không
}

// Danh sách các video sẽ được hiển thị ngẫu nhiên
// Bạn có thể thay đổi danh sách này với các video của riêng bạn
const videoList = [
  "/videos/123.mp4",
  "/videos/1234.mp4",
  "/videos/12345.mp4",
  // Thêm nhiều video khác tại đây
];

export function RandomVideo({ className = "", onVideoEnd, isActive = false }: RandomVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentVideo, setCurrentVideo] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Chọn video ngẫu nhiên từ danh sách
  const selectRandomVideo = (): string => {
    // Lấy video hiện tại để tránh chọn lại
    const currentIndex = videoList.indexOf(currentVideo);

    // Tạo mảng các video còn lại (loại bỏ video hiện tại)
    const remainingVideos = videoList.filter((_: string, index: number) => index !== currentIndex);

    // Nếu không còn video nào khác, sử dụng toàn bộ danh sách
    if (remainingVideos.length === 0) {
      return videoList[Math.floor(Math.random() * videoList.length)];
    }

    // Chọn ngẫu nhiên từ các video còn lại
    const randomIndex = Math.floor(Math.random() * remainingVideos.length);
    return remainingVideos[randomIndex];
  };

  // Khởi tạo video đầu tiên
  useEffect(() => {
    const initialVideo = selectRandomVideo();
    setCurrentVideo(initialVideo);
  }, []);

  // Xử lý khi video thay đổi
  useEffect(() => {
    if (!currentVideo || !videoRef.current) return;

    setIsLoading(true);
    setHasError(false);

    // Đặt lại video
    videoRef.current.load();

    // Tự động phát khi đã tải xong
    videoRef.current.onloadeddata = () => {
      setIsLoading(false);
      if (videoRef.current) {
        videoRef.current.play().catch(err => {
          console.error("Không thể tự động phát video:", err);
          setHasError(true);
        });
      }
    };

    // Xử lý lỗi video
    videoRef.current.onerror = () => {
      console.error("Lỗi khi tải video:", currentVideo);
      setHasError(true);
      setIsLoading(false);

      // Chuyển sang video khác nếu có lỗi
      setTimeout(() => {
        const newVideo = selectRandomVideo();
        setCurrentVideo(newVideo);
      }, 1000);
    };
  }, [currentVideo]);

  // Xử lý khi video kết thúc
  const handleVideoEnd = () => {
    // Chọn video mới
    const newVideo = selectRandomVideo();
    setCurrentVideo(newVideo);

    // Gọi callback nếu có
    if (onVideoEnd) {
      onVideoEnd();
    }
  };

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Hiển thị loading khi đang tải */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}

      {/* Hiển thị lỗi */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
          <div className="text-white text-sm bg-red-500/70 px-3 py-1 rounded-md">
            Không thể tải video
          </div>
        </div>
      )}

      {/* Video */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        onEnded={handleVideoEnd}
        muted // Tắt âm thanh vì đây là video nền
        loop={false} // Không lặp lại để có thể chuyển sang video khác
        playsInline // Hỗ trợ iOS
      >
        {currentVideo && <source src={currentVideo} type={`video/${currentVideo.split('.').pop()}`} />}
        Trình duyệt của bạn không hỗ trợ thẻ video.
      </video>

      {/* Hiển thị placeholder khi không có video */}
      {!currentVideo && !isLoading && (
        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
          <div className="text-white/50 text-sm">Đang tải video...</div>
        </div>
      )}

      {/* Hiệu ứng overlay khi đang nói */}
      {isActive && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-pink-500/20 to-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      )}
    </div>
  );
}
