"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface AudioWaveProps {
  isActive: boolean;
  color?: string;
  size?: number;
}

/**
 * Component hiển thị hiệu ứng sóng âm thanh
 * @param isActive Trạng thái hiệu ứng (true: đang phát âm thanh, false: không phát)
 * @param color Màu sắc của hiệu ứng sóng (mặc định: #ffffff)
 * @param size Kích thước của hiệu ứng (mặc định: 150)
 */
export function AudioWave({ isActive, color = "#ffffff", size = 150 }: AudioWaveProps) {
  // Số lượng thanh sóng âm
  const barCount = 5;

  // Tạo mảng các thanh sóng
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ opacity: isActive ? 1 : 0, transition: "opacity 0.3s ease" }}
    >
      <div className="flex items-center justify-center gap-1" style={{ width: size, height: size }}>
        {bars.map((i) => (
          <motion.div
            key={i}
            className="rounded-full"
            style={{
              backgroundColor: color,
              width: 4,
              height: isActive ? "40%" : "10%",
            }}
            animate={{
              height: isActive ? ["10%", "70%", "40%", "80%", "30%", "60%", "20%"] : "10%",
            }}
            transition={{
              duration: 1.2,
              ease: "easeInOut",
              repeat: Infinity,
              repeatType: "reverse",
              delay: i * 0.1,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Component hiển thị hiệu ứng nhịp tim khi nói
 * @param isActive Trạng thái hiệu ứng (true: đang phát âm thanh, false: không phát)
 * @param color Màu sắc của hiệu ứng (mặc định: #ffffff)
 * @param size Kích thước của hiệu ứng (mặc định: 150)
 */
export function CircularAudioWave({ isActive, color = "#ffffff", size = 150 }: AudioWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Đặt kích thước canvas
    canvas.width = size;
    canvas.height = size;

    let animationId: number;
    let time = 0;
    let heartbeatPhase = 0; // Pha của nhịp tim (0-1)
    let lastBeatTime = 0; // Thời gian nhịp tim cuối cùng

    // Phân tích màu để tạo màu RGBA
    const parseColor = (colorStr: string, alpha: number) => {
      // Nếu là mã hex
      if (colorStr.startsWith('#')) {
        const r = parseInt(colorStr.slice(1, 3), 16);
        const g = parseInt(colorStr.slice(3, 5), 16);
        const b = parseInt(colorStr.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      // Nếu đã là rgba hoặc rgb
      return colorStr.startsWith('rgb')
        ? colorStr.replace(/rgba?\(([^)]+)\)/, `rgba($1, ${alpha})`)
        : `rgba(255, 255, 255, ${alpha})`; // Mặc định trắng nếu không phân tích được
    };

    // Tạo gradient màu
    const createGradient = (alpha = 1) => {
      // Gradient từ trung tâm ra ngoài
      const gradient = ctx.createRadialGradient(
        size/2, size/2, 0,
        size/2, size/2, size/2
      );

      // Gradient với 3 điểm dừng sử dụng rgba
      gradient.addColorStop(0, parseColor(color, alpha));
      gradient.addColorStop(0.7, parseColor(color, alpha * 0.8));
      gradient.addColorStop(1, parseColor(color, 0));
      return gradient;
    };

    // Hàm vẽ hiệu ứng nhịp tim
    const draw = () => {
      // Xóa canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = size / 2;
      const centerY = size / 2;
      const heartSize = size / 4; // Kích thước cơ bản của trái tim

      // Tính toán thời gian nhịp tim
      const now = Date.now();

      // Nhịp tim nhẹ nhàng hơn và nhịp nhàng
      // Khi nói: 1000ms/nhịp (60 nhịp/phút) - nhịp tim bình thường
      // Khi không nói: 1200ms/nhịp (50 nhịp/phút) - nhịp tim nghỉ ngơi
      const beatInterval = isActive ? 1000 : 1200;

      // Tính toán thời gian trôi qua từ nhịp cuối cùng
      const timeSinceLastBeat = now - lastBeatTime;

      // Cập nhật pha nhịp tim theo đường cong mượt mà hơn
      if (timeSinceLastBeat > beatInterval) {
        lastBeatTime = now;
        heartbeatPhase = 1; // Bắt đầu nhịp mới
      } else {
        // Sử dụng hàm easeOutQuad để tạo hiệu ứng mượt mà hơn
        // Nhịp tim sẽ đập nhanh ở đầu và chậm dần về cuối
        const progress = timeSinceLastBeat / beatInterval;

        // Tạo hai nhịp đập cho mỗi chu kỳ - nhịp đập chính và nhịp đập phụ
        if (progress < 0.15) {
          // Nhịp đập chính - mạnh
          heartbeatPhase = 1 - easeOutQuad(progress / 0.15);
        } else if (progress < 0.3) {
          // Nhịp đập phụ - nhẹ hơn
          heartbeatPhase = 0.6 * (1 - easeOutQuad((progress - 0.15) / 0.15));
        } else {
          // Nghỉ giữa các nhịp
          heartbeatPhase = 0;
        }
      }

      // Hàm easeOutQuad để tạo hiệu ứng mượt mà
      function easeOutQuad(t: number): number {
        return t * (2 - t);
      }

      // Vẽ trái tim cho cả hai trạng thái (nói và không nói)
      // Vẽ nhiều lớp trái tim với độ trong suốt khác nhau
      const layerCount = 4;

      for (let layer = 0; layer < layerCount; layer++) {
        // Tính toán pha cho từng lớp - làm chậm hiệu ứng lan tỏa
        const layerPhase = Math.max(0, heartbeatPhase - (layer * 0.2));

        // Đặt độ trong suốt và màu sắc - nhẹ nhàng hơn
        const baseAlpha = isActive ? 0.25 : 0.15;
        const alpha = baseAlpha + (layerPhase * 0.4) - (layer * 0.05);
        ctx.globalAlpha = alpha;

        // Tạo hiệu ứng phát sáng - nhẹ nhàng hơn
        ctx.shadowBlur = 10 * layerPhase;
        ctx.shadowColor = color;

        // Tính toán kích thước trái tim - nhẹ nhàng hơn
        // Khi nói: biên độ đập lớn hơn
        // Khi không nói: biên độ đập nhỏ hơn
        const beatAmplitude = isActive ? 0.15 : 0.08;

        // Vẽ trái tim với kích thước thay đổi theo pha
        const scale = 1 + (layerPhase * beatAmplitude);
        const currentHeartSize = heartSize + (layer * 15);

        // Bắt đầu vẽ trái tim
        ctx.beginPath();

        // Di chuyển đến điểm đầu tiên
        ctx.moveTo(centerX, centerY - currentHeartSize * 0.4 * scale);

        // Vẽ nửa trái của trái tim
        ctx.bezierCurveTo(
          centerX - currentHeartSize * 0.5 * scale, centerY - currentHeartSize * 0.8 * scale, // điểm điều khiển 1
          centerX - currentHeartSize * scale, centerY - currentHeartSize * 0.1 * scale,      // điểm điều khiển 2
          centerX, centerY + currentHeartSize * 0.6 * scale                   // điểm đích
        );

        // Vẽ nửa phải của trái tim
        ctx.bezierCurveTo(
          centerX + currentHeartSize * scale, centerY - currentHeartSize * 0.1 * scale,      // điểm điều khiển 1
          centerX + currentHeartSize * 0.5 * scale, centerY - currentHeartSize * 0.8 * scale, // điểm điều khiển 2
          centerX, centerY - currentHeartSize * 0.4 * scale                   // điểm đích (quay lại điểm đầu)
        );

        ctx.closePath();

        // Tô màu cho trái tim
        if (layer === 0) {
          // Lớp trong cùng có màu đậm hơn
          ctx.fillStyle = color;
        } else {
          // Các lớp ngoài có gradient
          ctx.fillStyle = createGradient(alpha);
        }
        ctx.fill();

        // Vẽ đường viền cho trái tim
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = alpha * 0.7;
        ctx.stroke();

        // Vẽ các vòng tròn phát ra từ trái tim - nhẹ nhàng hơn
        if (layerPhase > 0.1) {
          ctx.beginPath();
          // Vòng tròn lan tỏa từ trái tim
          const pulseSize = heartSize * (1.5 + layer * 0.5 + (1 - layerPhase) * 1.5);
          ctx.arc(centerX, centerY, pulseSize, 0, Math.PI * 2);

          // Sử dụng hàm parseColor để tạo màu RGBA
          const pulseAlpha = layerPhase * 0.3; // Giảm độ đậm xuống 30%
          ctx.strokeStyle = parseColor(color, pulseAlpha);
          ctx.lineWidth = 1.5 * layerPhase;
          ctx.stroke();
        }
      }

      // Vẽ hiệu ứng nhịp điện tâm đồ (ECG) xung quanh - chỉ khi đang nói và nhịp tim đang đập
      if (isActive && heartbeatPhase > 0.1) {
        ctx.globalAlpha = heartbeatPhase * 0.6; // Nhẹ nhàng hơn
        ctx.beginPath();

        const ecgWidth = size * 0.8;
        const ecgHeight = size * 0.12; // Nhỏ hơn
        const ecgX = centerX - ecgWidth / 2;
        const ecgY = centerY + heartSize * 1.5;

        // Vẽ đường cơ sở
        ctx.moveTo(ecgX, ecgY);

        // Tính toán vị trí của đỉnh nhịp tim dựa trên pha
        const peakPosition = heartbeatPhase < 0.5 ? heartbeatPhase * 2 : 1;

        // Vẽ đường ECG
        const segmentWidth = ecgWidth / 10;

        // Phần đầu tiên của ECG
        ctx.lineTo(ecgX + segmentWidth * 2, ecgY);

        // Đỉnh P
        ctx.quadraticCurveTo(
          ecgX + segmentWidth * 2.5, ecgY - ecgHeight * 0.15,
          ecgX + segmentWidth * 3, ecgY
        );

        // Đoạn P-Q
        ctx.lineTo(ecgX + segmentWidth * 4, ecgY);

        // Phức hợp QRS - nhẹ nhàng hơn
        ctx.lineTo(ecgX + segmentWidth * 4.2, ecgY + ecgHeight * 0.08);
        ctx.lineTo(ecgX + segmentWidth * 4.5, ecgY - ecgHeight * 0.6 * peakPosition);
        ctx.lineTo(ecgX + segmentWidth * 5, ecgY + ecgHeight * 0.3 * peakPosition);
        ctx.lineTo(ecgX + segmentWidth * 5.5, ecgY);

        // Đoạn S-T
        ctx.lineTo(ecgX + segmentWidth * 6, ecgY);

        // Sóng T
        ctx.quadraticCurveTo(
          ecgX + segmentWidth * 7, ecgY - ecgHeight * 0.2 * peakPosition,
          ecgX + segmentWidth * 8, ecgY
        );

        // Phần cuối của ECG
        ctx.lineTo(ecgX + ecgWidth, ecgY);

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Tiếp tục animation
      time += 0.016; // Khoảng 60fps
      animationId = requestAnimationFrame(draw);
    };

    // Bắt đầu animation
    animationId = requestAnimationFrame(draw);

    // Dọn dẹp khi component unmount
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isActive, color, size]);

  return (
    <div className="w-full h-full flex items-center justify-center pointer-events-none">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="transition-opacity duration-300"
        style={{ opacity: isActive ? 1 : 0.4 }}
      />
    </div>
  );
}
