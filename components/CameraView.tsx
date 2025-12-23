
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { gestureService } from '../services/gestureService';
import { GestureLabel } from '../types';
import { MODEL_PATH } from '../constants';

declare const Hands: any;
declare const Camera: any;
declare const drawConnectors: any;
declare const drawLandmarks: any;
declare const HAND_CONNECTIONS: any;

interface CameraViewProps {
  onDetection: (word: string, confidence: number) => void;
  isActive: boolean;
}

const CameraView: React.FC<CameraViewProps> = ({ onDetection, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  const onResults = useCallback(async (results: any) => {
    if (!canvasRef.current) return;
    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // MIRROR UI
    canvasCtx.translate(canvasRef.current.width, 0);
    canvasCtx.scale(-1, 1);

    if (results.image) {
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    let currentFrameWord = GestureLabel.NONE;
    let currentFrameConfidence = 0;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      // 1. Check for Multi-Hand Gestures FIRST (Pray, Work)
      if (results.multiHandLandmarks.length >= 2) {
        const multiResult = gestureService.detectMultiHandGesture(results.multiHandLandmarks);
        if (multiResult.word !== GestureLabel.NONE) {
          currentFrameWord = multiResult.word;
          currentFrameConfidence = multiResult.confidence;
        }
      }

      // 2. Fallback to Single Hand Gestures only if no multi-hand found
      if (currentFrameWord === GestureLabel.NONE) {
        for (const landmarks of results.multiHandLandmarks) {
          const classification = await gestureService.classify(landmarks);
          if (classification.word !== GestureLabel.NONE) {
            currentFrameWord = classification.word;
            currentFrameConfidence = classification.confidence;
            break; // Just take the first valid single hand
          }
        }
      }

      // 3. Apply Smoothing and reporting
      const smoothed = gestureService.getSmoothedWord(currentFrameWord);
      onDetection(smoothed, currentFrameConfidence);

      // 4. Visual Overlays
      for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#10b981', lineWidth: 2 });
        drawLandmarks(canvasCtx, landmarks, { color: '#ffffff', lineWidth: 1, radius: 2 });

        const xs = landmarks.map((l: any) => l.x);
        const ys = landmarks.map((l: any) => l.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const width = (maxX - minX) * canvasRef.current.width;
        const height = (maxY - minY) * canvasRef.current.height;
        const x = minX * canvasRef.current.width;
        const y = minY * canvasRef.current.height;

        canvasCtx.strokeStyle = '#10b981';
        canvasCtx.lineWidth = 2;
        canvasCtx.strokeRect(x, y, width, height);

        if (smoothed !== GestureLabel.NONE) {
          canvasCtx.save();
          canvasCtx.scale(-1, 1);
          canvasCtx.fillStyle = '#10b981';
          canvasCtx.font = 'bold 20px Inter';
          canvasCtx.fillText(smoothed, -(x + width), y - 10);
          canvasCtx.restore();
        }
      }
    } else {
      onDetection(GestureLabel.NONE, 0);
      gestureService.getSmoothedWord(GestureLabel.NONE); // Push none to history
    }
    canvasCtx.restore();
  }, [onDetection]);

  useEffect(() => {
    const init = async () => {
      const hands = new Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5, // Lowered slightly to capture overlapping hands
        minTrackingConfidence: 0.5
      });
      hands.onResults(onResults);
      handsRef.current = hands;

      await gestureService.loadModel(MODEL_PATH);
    };

    init();
    return () => cameraRef.current?.stop();
  }, [onResults]);

  useEffect(() => {
    if (isActive && videoRef.current && handsRef.current && !cameraRef.current) {
      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && handsRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480
      });
      cameraRef.current.start();
    } else if (!isActive && cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
  }, [isActive]);

  return (
    <div className="relative w-full max-w-2xl mx-auto overflow-hidden rounded-2xl shadow-2xl border-4 border-slate-800 bg-black aspect-video">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="w-full h-full block" width={640} height={480} />
      
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm z-10">
          <p className="text-slate-400 font-bold tracking-widest uppercase text-sm">System Offline</p>
        </div>
      )}

      <div className="absolute top-4 left-4 z-20">
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full glass border border-white/10">
          <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-red-500'}`} />
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/90">
            {isActive ? 'Lens Active' : 'Lens Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CameraView;
