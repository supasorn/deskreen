// Low-latency video path: the host sends WebCodecs-encoded frames over the data
// channel; we decode each one as soon as it arrives and push it straight into a
// MediaStreamTrackGenerator, skipping WebRTC's jitter buffer (40-70ms on a
// tablet over Wi-Fi). The regular WebRTC video stays as the fallback.
//
// Wire format (must match the host's webCodecsSender): each encoded frame is
// split into messages of [magic, flags, timestamp (float64, µs), payload...].

const MAGIC = 0xd5;
const FLAG_KEY = 1;
const FLAG_START = 2;
const FLAG_END = 4;
const HEADER_BYTES = 10;

type TrackGenerator = MediaStreamTrack & {
	writable: WritableStream<VideoFrame>;
};
declare const MediaStreamTrackGenerator: {
	new (init: { kind: 'video' }): TrackGenerator;
};

const hasTrackGenerator = (): boolean =>
	typeof MediaStreamTrackGenerator !== 'undefined';

const hasCanvasCapture = (): boolean =>
	typeof HTMLCanvasElement !== 'undefined' &&
	'captureStream' in HTMLCanvasElement.prototype;

export function isWebCodecsReceiveSupported(): boolean {
	return (
		typeof VideoDecoder !== 'undefined' &&
		(hasTrackGenerator() || hasCanvasCapture())
	);
}

// how long fastest-transit samples are remembered for the pacing baseline
const TRANSIT_WINDOW_MS = 2000;

const PLAYOUT_BUFFER_STORAGE_KEY = 'deskreen_playout_buffer_ms';
const DEFAULT_PLAYOUT_BUFFER_MS = 30;

// Latency vs smoothness: open the viewer with ?buffer=<ms> to change it; the
// value is remembered on this device. 0 shows frames as soon as they decode.
export function getPlayoutBufferMs(): number {
	const fromUrl = new URLSearchParams(window.location.search).get('buffer');
	if (fromUrl !== null && Number.isFinite(Number(fromUrl))) {
		localStorage.setItem(PLAYOUT_BUFFER_STORAGE_KEY, fromUrl);
		return Math.max(0, Number(fromUrl));
	}
	const stored = localStorage.getItem(PLAYOUT_BUFFER_STORAGE_KEY);
	if (stored !== null && Number.isFinite(Number(stored))) {
		return Math.max(0, Number(stored));
	}
	return DEFAULT_PLAYOUT_BUFFER_MS;
}

export function isWebCodecsMessage(data: unknown): data is Uint8Array {
	return (
		data instanceof Uint8Array &&
		data.length >= HEADER_BYTES &&
		data[0] === MAGIC
	);
}

export default class WebCodecsReceiver {
	readonly stream: MediaStream;

	// hands a decoded frame to the stream and takes ownership of it
	private showFrame: (frame: VideoFrame) => void;

	private closeOutput: () => void;

	private decoder: VideoDecoder | null = null;

	private parts: Uint8Array[] = [];

	private isKey = false;

	private timestamp = 0;

	private isWaitingForKeyframe = true;

	private hasShownFrame = false;

	private onFirstFrame: (stream: MediaStream) => void;

	private requestKeyframe: () => void;

	private playoutBufferMs: number;

	// recent (arrival - capture) times, to find the fastest transit
	private transitSamples: { at: number; transit: number }[] = [];

	private scheduledFrames = new Map<number, VideoFrame>();

	constructor(
		onFirstFrame: (stream: MediaStream) => void,
		requestKeyframe: () => void,
		playoutBufferMs: number,
	) {
		this.onFirstFrame = onFirstFrame;
		this.requestKeyframe = requestKeyframe;
		this.playoutBufferMs = playoutBufferMs;
		if (hasTrackGenerator()) {
			const generator = new MediaStreamTrackGenerator({ kind: 'video' });
			const writer = generator.writable.getWriter();
			this.stream = new MediaStream([generator]);
			this.showFrame = (frame) => {
				void writer.write(frame).catch(() => frame.close());
			};
			this.closeOutput = () => {
				void writer.close().catch(() => undefined);
			};
		} else {
			// e.g. Android Chrome and Safari: draw into a canvas and stream that
			const canvas = document.createElement('canvas');
			const context = canvas.getContext('2d');
			this.stream = canvas.captureStream();
			this.showFrame = (frame) => {
				if (
					canvas.width !== frame.displayWidth ||
					canvas.height !== frame.displayHeight
				) {
					canvas.width = frame.displayWidth;
					canvas.height = frame.displayHeight;
				}
				context?.drawImage(frame, 0, 0);
				frame.close();
			};
			this.closeOutput = () => {
				this.stream.getTracks().forEach((track) => track.stop());
			};
		}
		this.createDecoder();
	}

	handleMessage(message: Uint8Array): void {
		const flags = message[1];
		if (flags & FLAG_START) {
			this.parts = [];
			this.isKey = (flags & FLAG_KEY) !== 0;
			this.timestamp = new DataView(
				message.buffer,
				message.byteOffset,
				message.byteLength,
			).getFloat64(2);
		}
		this.parts.push(message.subarray(HEADER_BYTES));
		if (flags & FLAG_END) {
			this.decodeFrame();
		}
	}

	close(): void {
		if (this.decoder && this.decoder.state !== 'closed') {
			this.decoder.close();
		}
		this.scheduledFrames.forEach((frame, timer) => {
			window.clearTimeout(timer);
			frame.close();
		});
		this.scheduledFrames.clear();
		this.closeOutput();
	}

	private decodeFrame(): void {
		const length = this.parts.reduce((sum, part) => sum + part.length, 0);
		const data = new Uint8Array(length);
		let offset = 0;
		this.parts.forEach((part) => {
			data.set(part, offset);
			offset += part.length;
		});
		this.parts = [];

		// a delta frame is useless until we have its keyframe
		if (this.isWaitingForKeyframe && !this.isKey) return;
		if (!this.decoder || this.decoder.state === 'closed') {
			this.createDecoder();
			if (!this.isKey) return;
		}
		this.isWaitingForKeyframe = false;
		this.decoder?.decode(
			new EncodedVideoChunk({
				type: this.isKey ? 'key' : 'delta',
				timestamp: this.timestamp,
				data,
			}),
		);
	}

	// Shows each frame at its capture time plus a fixed delay, measured from the
	// fastest recent frames. Motion stays as even as it was on the host, and
	// frames held up by up to playoutBufferMs (e.g. Wi-Fi power saving) no
	// longer stutter; later ones are shown as soon as they arrive.
	private scheduleFrame(frame: VideoFrame): void {
		if (this.playoutBufferMs <= 0) {
			this.showFrame(frame);
			return;
		}
		const now = performance.now();
		const captureMs = frame.timestamp / 1000;
		this.transitSamples.push({ at: now, transit: now - captureMs });
		while (this.transitSamples[0].at < now - TRANSIT_WINDOW_MS) {
			this.transitSamples.shift();
		}
		const fastestTransit = Math.min(
			...this.transitSamples.map((sample) => sample.transit),
		);
		const delay = captureMs + fastestTransit + this.playoutBufferMs - now;
		if (delay <= 1) {
			this.showFrame(frame);
			return;
		}
		const timer = window.setTimeout(() => {
			this.scheduledFrames.delete(timer);
			this.showFrame(frame);
		}, delay);
		this.scheduledFrames.set(timer, frame);
	}

	private createDecoder(): void {
		this.decoder = new VideoDecoder({
			output: (frame) => {
				if (!this.hasShownFrame) {
					this.hasShownFrame = true;
					this.onFirstFrame(this.stream);
				}
				this.scheduleFrame(frame);
			},
			error: (error) => {
				console.error('webcodecs decoder error', error);
				this.decoder = null;
				this.isWaitingForKeyframe = true;
				this.requestKeyframe();
			},
		});
		this.decoder.configure({ codec: 'vp8', optimizeForLatency: true });
		this.isWaitingForKeyframe = true;
	}
}
