# Vosk Offline Speech-to-Text Model

This folder is reserved for the lightweight English Vosk model used by the NeuroSense speech analysis module.

## Required model

- Model family: vosk-model-small-en-us
- Recommended version: vosk-model-small-en-us-0.15

## Download and install

1. Open the official Vosk models page:
   https://alphacephei.com/vosk/models
2. Download the archive for vosk-model-small-en-us (for example, vosk-model-small-en-us-0.15.zip).
3. Extract the archive contents into this folder.

After extraction, this directory should contain model files and folders such as:

- am/
- conf/
- graph/
- ivector/

Your app config should point to this folder path:

./trained_models/vosk_model
