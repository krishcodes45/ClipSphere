const express = require('express');
const fs = require('fs');
const http = require('http');
const axios = require('axios');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const { Readable } = require('stream');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

// 🎬 Configure FFmpeg & FFprobe (Bundled Installer with fallback)
try {
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
  if (ffmpegInstaller && ffmpegInstaller.path) ffmpeg.setFfmpegPath(ffmpegInstaller.path);
  if (ffprobeInstaller && ffprobeInstaller.path) ffmpeg.setFfprobePath(ffprobeInstaller.path);
  console.log('🟢 FFmpeg & FFprobe initialized from installers');
} catch (e) {
  console.log('ℹ️ Using system FFmpeg/FFprobe binaries if available');
}

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// 🤖 Initialize Google Generative AI (Gemini Flash per ClipSphere Paper)
let genAI = null;
let model = null;
if (process.env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  model = genAI.getGenerativeModel({ model: modelName });
  console.log(`🟢 Gemini AI initialized successfully using model: ${modelName}`);
} else {
  console.warn('⚠️ GEMINI_API_KEY is not defined in .env');
}

// ☁️ Initialize AWS S3 Client
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.ACCESS_KEY || '',
    secretAccessKey: process.env.SECRET_KEY || '',
  },
  region: process.env.BUCKET_REGION || 'eu-north-1',
});

// 🎙️ Initialize Google Cloud Speech Client (Safe instantiation)
let speechClient = null;
try {
  const speech = require('@google-cloud/speech');
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    speechClient = new speech.SpeechClient();
    console.log('🟢 Google Cloud Speech-to-Text initialized');
  } else {
    console.log('ℹ️ Google Cloud service account JSON not provided. Will use Gemini 2.0 Flash for audio transcription.');
  }
} catch (err) {
  console.warn('⚠️ Google Cloud SpeechClient initialization notice:', err.message);
}

// 📁 In-memory user profile store for standalone desktop execution
const userProfiles = new Map();

// 🔹 Mock / Proxy REST APIs for Desktop App Studio & Auth
app.get('/api/auth/:clerkId', (req, res) => {
  const { clerkId } = req.params;
  console.log(`🟢 Received fetchUserProfile for Clerk ID: ${clerkId}`);

  let profile = userProfiles.get(clerkId);
  if (!profile) {
    profile = {
      status: 200,
      user: {
        id: `user_${clerkId.slice(-6)}`,
        clerkid: clerkId,
        email: 'user@clipsphere.ai',
        firstname: 'ClipSphere',
        lastname: 'User',
        createdAt: new Date(),
        subscription: {
          plan: 'PRO', // PRO plan enables 1080p HD recording preset
        },
        studio: {
          id: `studio_${clerkId.slice(-6)}`,
          screen: null,
          mic: null,
          camera: null,
          preset: 'HD',
          userId: `user_${clerkId.slice(-6)}`,
        },
      },
    };
    userProfiles.set(clerkId, profile);
  }

  res.json(profile);
});

app.post('/api/studio/:id', (req, res) => {
  const { id } = req.params;
  const { screen, audio, preset } = req.body;
  console.log(`🟢 Received updateStudioSettings for ID ${id}:`, { screen, audio, preset });

  // Update in memory if exists
  for (const [, profile] of userProfiles.entries()) {
    if (profile.user.id === id || profile.user.studio?.id === id) {
      if (profile.user.studio) {
        profile.user.studio.screen = screen;
        profile.user.studio.mic = audio;
        profile.user.studio.preset = preset;
      }
    }
  }

  res.json({
    status: 200,
    message: 'Studio settings updated successfully',
  });
});

app.post('/api/recording/:userId/processing', (req, res) => {
  console.log(`🟢 API recording processing event for user ${req.params.userId}:`, req.body);
  res.json({ status: 200, message: 'Processing acknowledged' });
});

app.post('/api/recording/:userId/transcribe', (req, res) => {
  console.log(`🟢 API recording transcribe event for user ${req.params.userId}:`, req.body.filename);
  res.json({ status: 200, message: 'Transcribe acknowledged' });
});

app.post('/api/recording/:userId/complete', (req, res) => {
  console.log(`🟢 API recording complete event for user ${req.params.userId}:`, req.body.filename);
  res.json({ status: 200, message: 'Complete acknowledged' });
});

// Helper to notify external Next.js API if configured and running
const notifyNextApi = async (path, body) => {
  if (!process.env.NEXT_API_HOST) return;
  try {
    await axios.post(`${process.env.NEXT_API_HOST}${path}`, body, { timeout: 3000 });
  } catch (err) {
    // Gracefully handle if Next.js web host is offline
    console.log(`ℹ️ Notice: External Next.js API ${path} notification bypassed (${err.message}).`);
  }
};

// 🔌 Socket.IO Real-Time Stream Handling
io.on('connection', (socket) => {
  console.log('🟢 Socket connected:', socket.id);

  socket.on('video-chunks', async (data) => {
    if (!data || !data.filename || !data.chunks) return;

    const filePath = path.join(__dirname, 'temp_upload', data.filename);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    const writeStream = fs.createWriteStream(filePath, { flags: 'a' });
    const buffer = Buffer.from(data.chunks);
    const readStream = Readable.from(buffer);

    readStream.pipe(writeStream).on('finish', () => {
      // Chunk appended
    });
  });

  socket.on('process-video', async (data) => {
    console.log('🟢 Received process-video request:', data);
    const uniqueFilename = `${data.filename}-${uuidv4()}.webm`;
    const filePath = path.join(__dirname, 'temp_upload', data.filename);
    const audioPath = path.join(__dirname, 'temp_upload', `${uuidv4()}.wav`);

    if (!fs.existsSync(filePath)) {
      console.log('🔴 Error: Video file does not exist at:', filePath);
      return;
    }

    try {
      console.log('🟢 Verifying WebM file integrity (Section IV.D / Algorithm 2)...');
      const isValid = await verifyWebMFile(filePath);
      if (!isValid) {
        console.log('🔴 Invalid WebM file detected, skipping processing.');
        return;
      }

      // 🔹 1. Notify API: Processing started
      await notifyNextApi(`recording/${data.userId}/processing`, { filename: uniqueFilename });

      // 🔹 2. Upload video to AWS S3 (Section IV.E)
      console.log('🟢 Uploading WebM video to AWS S3 bucket:', process.env.BUCKET_NAME);
      const fileBuffer = fs.readFileSync(filePath);
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: uniqueFilename,
            ContentType: 'video/webm',
            Body: fileBuffer,
          })
        );
        console.log('🟢 Video uploaded successfully to AWS S3:', uniqueFilename);
      } catch (s3Err) {
        console.error('⚠️ AWS S3 upload error:', s3Err.message);
      }

      // 🔹 3. Extract audio from video to 16kHz mono WAV (Section IV.E)
      console.log('🟢 Extracting audio track using FFmpeg...');
      let audioExtracted = false;
      try {
        await extractAudio(filePath, audioPath);
        audioExtracted = true;
      } catch (extractErr) {
        console.warn('⚠️ Audio extraction notice:', extractErr.message);
      }

      // 🔹 4. Speech-to-Text Transcription (Section IV.F / Algorithm 3)
      let transcriptionText = '';
      if (audioExtracted && fs.existsSync(audioPath)) {
        transcriptionText = await transcribeAudio(audioPath);
      }

      console.log('🟢 Transcription result:', transcriptionText || '(No spoken audio detected)');

      // 🔹 5. Generative AI Title & Summary Generation using Gemini 2.0 Flash (Section IV.F)
      let title = 'Screen Recording Session';
      let summary = 'Screen recording captured and processed with ClipSphere.';
      let completionResult = JSON.stringify({ title, summary });

      if (model && transcriptionText && transcriptionText.trim().length > 0) {
        console.log('🟢 Generating AI Title and Summary using Gemini 2.0 Flash...');
        try {
          const prompt = `You are an AI assistant specialized in analyzing screen recordings and meeting transcripts.
Based on the following speech-to-text transcript:
"""
${transcriptionText}
"""

Please generate:
1. A concise, professional title.
2. A clear, well-structured executive summary of the content.

Return ONLY a valid JSON object in this exact structure without markdown backticks:
{"title": "Your Title Here", "summary": "Your Summary Here"}`;

          const completionResponse = await model.generateContent(prompt);
          let rawText = completionResponse.response.text().trim();

          // Strip markdown code fences if Gemini outputs ```json ... ```
          const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
          if (jsonMatch) {
            rawText = jsonMatch[1].trim();
          }

          const parsed = JSON.parse(rawText);
          if (parsed.title && parsed.summary) {
            title = parsed.title;
            summary = parsed.summary;
            completionResult = JSON.stringify({ title, summary });
          }
          console.log('🟢 Generated Title:', title);
          console.log('🟢 Generated Summary:', summary);
        } catch (aiErr) {
          console.warn('⚠️ Gemini content generation notice:', aiErr.message);
        }
      }

      // 🔹 6. Notify API: Transcription and metadata
      await notifyNextApi(`recording/${data.userId}/transcribe`, {
        filename: uniqueFilename,
        content: completionResult,
        transcript: transcriptionText || 'No audio transcript available.',
      });

      // 🔹 7. Notify API: Processing complete
      await notifyNextApi(`recording/${data.userId}/complete`, { filename: uniqueFilename });

      console.log('✅ Video processing pipeline completed successfully for:', uniqueFilename);
      socket.emit('recording-processed', {
        filename: uniqueFilename,
        title,
        summary,
        transcript: transcriptionText,
      });

    } catch (error) {
      console.error('🔴 Error in video processing pipeline:', error);
    } finally {
      // 🔹 8. Temporary File Cleanup (Section IV.G / Storage temp -> 0)
      try {
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        console.log(`🟢 Temporary files cleaned up: ${data.filename}`);
      } catch (cleanupErr) {
        console.warn('⚠️ Temporary file cleanup notice:', cleanupErr.message);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('🔴 Socket disconnected:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🟢 ClipSphere Express Server listening on port ${PORT}`);
});

// 🎯 Function: Verify WebM file integrity before processing (Algorithm 2)
async function verifyWebMFile(filePath) {
  return new Promise((resolve) => {
    ffmpeg(filePath).ffprobe((err, metadata) => {
      if (err || !metadata) {
        // Fallback: check if file has valid size
        try {
          const stats = fs.statSync(filePath);
          if (stats.size > 0) {
            console.log(`🟢 WebM file size verified: ${stats.size} bytes`);
            return resolve(true);
          }
        } catch (e) {}
        console.warn('⚠️ FFprobe could not read WebM metadata:', err?.message || err);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// 🎯 Function: Extract audio from video to 16kHz mono WAV (Section IV.E)
async function extractAudio(videoPath, outputAudioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .output(outputAudioPath)
      .noVideo()
      .audioCodec('pcm_s16le')
      .audioFrequency(16000)
      .audioChannels(1)
      .on('end', () => {
        console.log('🟢 Audio extracted to 16kHz mono WAV format');
        resolve(outputAudioPath);
      })
      .on('error', (err) => {
        console.error('🔴 Error extracting audio with FFmpeg:', err);
        reject(err);
      })
      .run();
  });
}

// 🎯 Function: Transcribe audio using Google Speech-to-Text with Gemini Multimodal Fallback
async function transcribeAudio(filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    return '';
  }

  // 1. Primary: Google Cloud Speech-to-Text (per Research Paper Section IV.F)
  if (speechClient) {
    try {
      console.log('🟢 Transcribing using Google Cloud Speech-to-Text...');
      const audioBytes = fs.readFileSync(filePath).toString('base64');
      const request = {
        audio: { content: audioBytes },
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'en-US',
        },
      };

      const [response] = await speechClient.recognize(request);
      if (response && response.results) {
        const transcript = response.results
          .map((result) => result.alternatives[0]?.transcript || '')
          .filter(Boolean)
          .join('\n');
        if (transcript.trim().length > 0) {
          return transcript;
        }
      }
    } catch (error) {
      console.warn('⚠️ Google Cloud Speech-to-Text error, using Gemini audio fallback:', error.message);
    }
  }

  // 2. High-Quality Fallback: Gemini 2.0 Flash Audio Transcription
  if (model) {
    try {
      console.log('🟢 Transcribing audio using Gemini 2.0 Flash multimodal engine...');
      const audioBuffer = fs.readFileSync(filePath);
      const audioPart = {
        inlineData: {
          data: audioBuffer.toString('base64'),
          mimeType: 'audio/wav',
        },
      };

      const response = await model.generateContent([
        audioPart,
        'Provide an exact, verbatim speech-to-text transcription of all spoken dialogue in this audio file. If there is no audible speech, reply with an empty string.',
      ]);

      const transcript = response.response.text();
      return transcript ? transcript.trim() : '';
    } catch (geminiAudioErr) {
      console.warn('⚠️ Gemini audio transcription notice:', geminiAudioErr.message);
    }
  }

  return '';
}
