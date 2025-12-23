
# ISL Sense MVP: Setup & Training Guide

## 1. Using your Grid Image
To use the master image you provided for training:
1. **Crop**: You MUST crop the master image into individual pictures for each gesture.
2. **Organize**: Place the cropped images into their respective folders in the `/dataset` directory.
   - Example: Crop the "Call" hand and save it as `call_1.jpg` in `dataset/Call/`.
3. **Augment**: Since one image per gesture isn't enough for high accuracy, we recommend taking a few photos of yourself performing the same signs from different angles.

## 2. Model Training
1. Run `python training_script.py` once to ensure all 37 gesture folders exist.
2. Fill the folders with images (aim for 10-20 images per folder).
3. Run `python training_script.py` again to train and export the `model.json`.

## 3. Real-time Detection
1. Once the model is exported to `/model/model.json`, the web app will automatically switch from "Demo Mode" (heuristics) to "AI Active" (neural network).
2. The system now supports 37 distinct signs!

## 4. Multi-Hand Signs
- Signs like **Xsign**, **Heart**, and **Holy** utilize two hands. The system is configured to prioritize two-hand gestures when two hands are in the frame.
