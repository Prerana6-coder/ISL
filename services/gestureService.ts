
import * as tf from '@tensorflow/tfjs';
import { Landmark, GestureLabel } from '../types';
import { CONFIDENCE_THRESHOLD, GESTURE_LABELS, ROLLING_AVERAGE_WINDOW } from '../constants';

class GestureService {
  private model: tf.LayersModel | null = null;
  public isDemoMode: boolean = true;
  
  private labelScores: Record<string, number> = {};
  private readonly alpha = 2 / (ROLLING_AVERAGE_WINDOW + 1);

  async loadModel(path: string) {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      if (response.ok) {
        this.model = await tf.loadLayersModel(path);
        this.isDemoMode = false;
        console.log('TF.js Full ISL Model Loaded (37 Classes).');
      } else {
        throw new Error('Model file not found');
      }
    } catch (error) {
      this.isDemoMode = true;
      console.warn('Custom model not found. Using Heuristic Demo Mode.');
    }
  }

  private preprocessLandmarks(landmarks: Landmark[]): number[] {
    const wrist = landmarks[0];
    const referenceDist = Math.sqrt(
      Math.pow(landmarks[9].x - wrist.x, 2) + 
      Math.pow(landmarks[9].y - wrist.y, 2)
    ) || 1;

    return landmarks.flatMap(lm => [
      (lm.x - wrist.x) / referenceDist,
      (lm.y - wrist.y) / referenceDist
    ]);
  }

  /**
   * Handles gestures that require two hands (e.g., Xsign, Heart, Holy, Timeout)
   */
  public detectMultiHandGesture(hands: any[][]): { word: GestureLabel; confidence: number } {
    if (hands.length < 2) return { word: GestureLabel.NONE, confidence: 0 };
    
    const h1 = hands[0];
    const h2 = hands[1];
    
    // Simple heuristic for "Holy" (Praying hands) - hands are very close
    const dist = Math.abs(h1[0].x - h2[0].x);
    if (dist < 0.1) return { word: GestureLabel.HOLY, confidence: 0.95 };

    // Simple heuristic for "Xsign" - wrists cross or hands in cross shape
    if (Math.abs(h1[0].x - h2[0].x) < 0.2 && Math.abs(h1[0].y - h2[0].y) < 0.1) {
       return { word: GestureLabel.XSIGN, confidence: 0.90 };
    }

    return { word: GestureLabel.NONE, confidence: 0 };
  }

  private heuristicClassify(landmarks: any[]): { word: GestureLabel; confidence: number } {
    const isExtended = (tipIdx: number, baseIdx: number) => landmarks[tipIdx].y < landmarks[baseIdx].y;
    
    const index = isExtended(8, 6);
    const middle = isExtended(12, 10);
    const ring = isExtended(16, 14);
    const pinky = isExtended(20, 18);

    if (index && middle && ring && pinky) return { word: GestureLabel.HI, confidence: 0.95 };
    if (index && pinky && !middle && !ring) return { word: GestureLabel.I_LOVE_YOU, confidence: 0.98 };
    if (index && !middle && !ring && !pinky) return { word: GestureLabel.ONE, confidence: 0.90 };
    if (!index && !middle && !ring && !pinky) return { word: GestureLabel.FIST, confidence: 0.92 };

    return { word: GestureLabel.NONE, confidence: 0 };
  }

  async classify(landmarks: Landmark[]): Promise<{ word: GestureLabel; confidence: number }> {
    if (this.isDemoMode || !this.model) {
      return this.heuristicClassify(landmarks);
    }

    try {
      const inputData = this.preprocessLandmarks(landmarks);
      const inputTensor = tf.tensor2d([inputData]);
      const prediction = this.model.predict(inputTensor) as tf.Tensor;
      const scores = await prediction.data();
      
      const scoresArray = Array.from(scores) as number[];
      const maxScore = Math.max(...scoresArray);
      const maxIndex = scoresArray.indexOf(maxScore);

      inputTensor.dispose();
      prediction.dispose();

      if (maxScore > CONFIDENCE_THRESHOLD) {
        return { 
          word: GESTURE_LABELS[maxIndex] || GestureLabel.NONE, 
          confidence: maxScore 
        };
      }
    } catch (e) {
      console.error("Inference error:", e);
    }

    return { word: GestureLabel.NONE, confidence: 0 };
  }

  getSmoothedWord(newWord: GestureLabel): GestureLabel {
    const labelsToUpdate = [...GESTURE_LABELS, GestureLabel.NONE];

    labelsToUpdate.forEach(label => {
      const currentScore = this.labelScores[label] || 0;
      const observation = (label === newWord) ? 1 : 0;
      this.labelScores[label] = (this.alpha * observation) + (1 - this.alpha) * currentScore;
    });

    let bestLabel = GestureLabel.NONE;
    let maxScore = -1;

    labelsToUpdate.forEach(label => {
      const score = this.labelScores[label];
      if (score > maxScore) {
        maxScore = score;
        bestLabel = label;
      }
    });

    return maxScore > 0.35 ? bestLabel : GestureLabel.NONE;
  }
}

export const gestureService = new GestureService();
