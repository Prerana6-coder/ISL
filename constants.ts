
import { GestureLabel } from './types';

export const GESTURE_LABELS = [
  GestureLabel.HI,
  GestureLabel.I_LOVE_YOU,
  GestureLabel.WARN,
  GestureLabel.CALL,
  GestureLabel.DISLIKE,
  GestureLabel.FIST,
  GestureLabel.FOUR,
  GestureLabel.LIKE,
  GestureLabel.MUTE,
  GestureLabel.GRABBING,
  GestureLabel.GRIP,
  GestureLabel.OK,
  GestureLabel.ONE,
  GestureLabel.PALM,
  GestureLabel.PEACE,
  GestureLabel.PEACE_INV,
  GestureLabel.ROCK,
  GestureLabel.POINT,
  GestureLabel.PINKIE,
  GestureLabel.STOP,
  GestureLabel.STOP_INV,
  GestureLabel.THREE,
  GestureLabel.THREE2,
  GestureLabel.TWO_UP,
  GestureLabel.TWO_UP_INV,
  GestureLabel.MID_FINGER,
  GestureLabel.THREE3,
  GestureLabel.GUN,
  GestureLabel.THUMB,
  GestureLabel.INDEX,
  GestureLabel.THUMB_INDEX2,
  GestureLabel.HOLY,
  GestureLabel.TIMEOUT,
  GestureLabel.TAKE_PHOTO,
  GestureLabel.XSIGN,
  GestureLabel.HEART,
  GestureLabel.HEART2
];

export const CONFIDENCE_THRESHOLD = 0.80; // Lowered slightly to account for high class count
export const ROLLING_AVERAGE_WINDOW = 12; // Increased for better stability with more classes
export const MODEL_PATH = '/model/model.json';
