import { useEffect, useRef } from 'react'

const WebCam = () => {
    const camElement = useRef<HTMLVideoElement | null>(null)

    useEffect(() => {
        let stream: MediaStream | null = null
        let cancelled = false

        const streamWebCam = async () => {
            try {
                // Video only: requesting audio here played the microphone back
                // through the speakers (feedback echo) and the preview never needs it.
                stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false,
                })

                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop())
                    return
                }

                if (camElement.current) {
                    camElement.current.srcObject = stream
                    await camElement.current.play()
                }
            } catch (err) {
                console.error('Could not start webcam:', err)
            }
        }

        streamWebCam()

        return () => {
            cancelled = true
            stream?.getTracks().forEach((t) => t.stop())
        }
    }, [])

    return (
        <video
            ref={camElement}
            muted
            playsInline
            className="h-screen draggable object-cover rounded-full aspect-video border-2 relative border-white"
        ></video>
    )
}

export default WebCam
