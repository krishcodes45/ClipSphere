import { hidePluginWindow } from './utils'
import { v4 as uuid } from 'uuid'
import io from 'socket.io-client'

let videoTransferFileName: string | undefined
let mediaRecorder: MediaRecorder | undefined
let userId: string
let activeStreams: MediaStream[] = []

const socket = io(import.meta.env.VITE_SOCKET_URL as string)

export const StartRecording = async (onSources: {
  screen: string
  audio: string
  id: string
}) => {
  if (!mediaRecorder) {
    console.error('MediaRecorder is not initialized');
    return;
  }

  hidePluginWindow(true);
  videoTransferFileName = `${uuid()}-${onSources?.id.slice(0, 8)}.webm`;

  console.log('Starting recording...');
  mediaRecorder.start(1000); // Capture data every second
};

export const onStopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
}

// Runs once, from MediaRecorder.onstop (which fires after the final
// dataavailable event). It used to also run from onDataAvailable, which made
// the app request processing twice for every recording.
const stopRecording = () => {
  hidePluginWindow(false);
  console.log('Processing video...');

  socket.emit('process-video', {
    filename: videoTransferFileName,
    userId
  });
};

export const onDataAvailable = (e: BlobEvent) => {
  console.log('onDataAvailable triggered', e.data.size);

  if (e.data.size > 0) {
    socket.emit('video-chunks', {
      chunks: e.data,
      filename: videoTransferFileName,
    });
  }
};

const releaseStreams = () => {
  activeStreams.forEach((s) => s.getTracks().forEach((t) => t.stop()))
  activeStreams = []
}

export const selectSources = async (
  onSources: {
    screen: string
    audio: string
    id: string
    preset: 'HD' | 'SD'
  },
  videoElement: React.RefObject<HTMLVideoElement>
) => {
  if (onSources && onSources.screen && onSources.audio && onSources.id) {
    // Don't start a new capture while one is being recorded.
    if (mediaRecorder && mediaRecorder.state === 'recording') return

    const constraints: any = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: onSources?.screen,
          minWidth: onSources.preset === 'HD' ? 1920 : 1280,
          maxWidth: onSources.preset === 'HD' ? 1920 : 1280,
          minHeight: onSources.preset === 'HD' ? 1080 : 720,
          maxHeight: onSources.preset === 'HD' ? 1080 : 720,
          frameRate: 30,
        },
      },
    };

    userId = onSources.id;

    console.log('Selecting sources with constraints:', constraints);

    try {
      // Free the previous capture before creating a new one (these used to leak).
      releaseStreams()

      // Creating the screen recording stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      activeStreams.push(stream)

      // Audio stream. Fall back to the default mic, then to video-only,
      // so a bad device id doesn't leave the recorder uninitialised.
      let audioStream: MediaStream | null = null
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: onSources?.audio ? { deviceId: { exact: onSources.audio } } : true,
        });
      } catch (audioErr) {
        console.warn('Selected audio device unavailable, trying default mic:', audioErr)
        try {
          audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true })
        } catch (fallbackErr) {
          console.warn('No audio available, recording video only:', fallbackErr)
        }
      }
      if (audioStream) activeStreams.push(audioStream)

      if (videoElement && videoElement.current) {
        videoElement.current.srcObject = stream;
        await videoElement.current.play();
      }

      // Merging video + audio streams
      const combinedStream = new MediaStream([
        ...stream.getTracks(),
        ...(audioStream ? audioStream.getTracks() : []),
      ]);

      mediaRecorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });

      mediaRecorder.ondataavailable = onDataAvailable;
      mediaRecorder.onstop = stopRecording
    } catch (err) {
      console.error('Failed to select recording sources:', err)
    }
  }
};
