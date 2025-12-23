
export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface DetectionResult {
  word: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export enum GestureLabel {
  // Existing/User Specific
  HI = "Hi",
  I_LOVE_YOU = "I Love You",
  WARN = "Warn",
  
  // From provided grid image
  CALL = "Call",
  DISLIKE = "Dislike",
  FIST = "Fist",
  FOUR = "Four",
  LIKE = "Like",
  MUTE = "Mute",
  GRABBING = "Grabbing",
  GRIP = "Grip",
  OK = "Ok",
  ONE = "One",
  PALM = "Palm",
  PEACE = "Peace",
  PEACE_INV = "Peace Inv",
  ROCK = "Rock",
  POINT = "Point",
  PINKIE = "Pinkie",
  STOP = "Stop",
  STOP_INV = "Stop Inv",
  THREE = "Three",
  THREE2 = "Three2",
  TWO_UP = "Two Up",
  TWO_UP_INV = "Two Up Inv",
  MID_FINGER = "Mid. Finger",
  THREE3 = "Three3",
  GUN = "Gun",
  THUMB = "Thumb",
  INDEX = "Index",
  THUMB_INDEX2 = "Thumb Index2",
  HOLY = "Holy",
  TIMEOUT = "Timeout",
  TAKE_PHOTO = "Take Photo",
  XSIGN = "Xsign",
  HEART = "Heart",
  HEART2 = "Heart2",

  NONE = "Searching..."
}

export interface AppState {
  isCameraActive: boolean;
  detectedWord: string;
  confidence: number;
  history: string[];
}
