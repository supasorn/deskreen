// Low-latency video path: encode captured frames with WebCodecs and send them
// over the peer's data channel. The viewer decodes and shows each frame as soon
// as it arrives, skipping WebRTC's jitter buffer (40-70ms on a tablet over
// Wi-Fi). Used only when the viewer asks for it; WebRTC video is the fallback.
//
// Wire format (must match the viewer's webCodecsReceiver): each encoded frame is
// split into messages of [magic, flags, timestamp (float64, µs), payload...].

const MAGIC = 0xd5;
const FLAG_KEY = 1;
const FLAG_START = 2;
const FLAG_END = 4;
const HEADER_BYTES = 10;
const MAX_MESSAGE_BYTES = 60 * 1024;

// skip raw frames while this much is still queued, so delay can't build up;
// skipping before encoding keeps the stream decodable without a keyframe
const MAX_BUFFERED_BYTES = 64 * 1024;
const BITRATE = 10_000_000;

type TrackProcessor = { readable: ReadableStream<VideoFrame> };
declare const MediaStreamTrackProcessor: {
	new (init: { track: MediaStreamTrack }): TrackProcessor;
};

export function isWebCodecsSendSupported(): boolean {
	return (
		typeof VideoEncoder !== 'undefined' &&
		typeof MediaStreamTrackProcessor !== 'undefined'
	);
}

export default class WebCodecsSender {
	private channel: RTCDataChannel;

	private track: MediaStreamTrack | null = null;

	private reader: ReadableStreamDefaultReader<VideoFrame> | null = null;

	private encoder: VideoEncoder | null = null;

	private width = 0;

	private height = 0;

	private needKeyframe = true;

	private isStopped = false;

	constructor(channel: RTCDataChannel) {
		this.channel = channel;
	}

	start(sourceTrack: MediaStreamTrack): void {
		// a clone, so the WebRTC sender's track can be replaced or stopped freely
		this.track = sourceTrack.clone();
		this.reader = new MediaStreamTrackProcessor({
			track: this.track,
		}).readable.getReader();
		void this.readFrames();
	}

	requestKeyframe(): void {
		this.needKeyframe = true;
	}

	stop(): void {
		this.isStopped = true;
		void this.reader?.cancel().catch(() => undefined);
		this.track?.stop();
		if (this.encoder && this.encoder.state !== 'closed') {
			this.encoder.close();
		}
	}

	private async readFrames(): Promise<void> {
		while (!this.isStopped && this.reader) {
			const { value: frame, done } = await this.reader.read();
			if (done || !frame) break;
			this.encodeFrame(frame);
		}
	}

	private encodeFrame(frame: VideoFrame): void {
		try {
			if (
				this.isStopped ||
				this.channel.readyState !== 'open' ||
				this.channel.bufferedAmount > MAX_BUFFERED_BYTES ||
				(this.encoder && this.encoder.encodeQueueSize > 1)
			) {
				return;
			}
			if (
				!this.encoder ||
				this.encoder.state === 'closed' ||
				frame.displayWidth !== this.width ||
				frame.displayHeight !== this.height
			) {
				this.configureEncoder(frame.displayWidth, frame.displayHeight);
			}
			this.encoder?.encode(frame, { keyFrame: this.needKeyframe });
			this.needKeyframe = false;
		} finally {
			frame.close();
		}
	}

	private configureEncoder(width: number, height: number): void {
		if (this.encoder && this.encoder.state !== 'closed') {
			this.encoder.close();
		}
		this.width = width;
		this.height = height;
		this.encoder = new VideoEncoder({
			output: (chunk) => this.sendChunk(chunk),
			error: (error) => {
				console.error('webcodecs encoder error', error);
				// recreated on the next frame
				this.encoder = null;
				this.needKeyframe = true;
			},
		});
		this.encoder.configure({
			codec: 'vp8',
			width,
			height,
			bitrate: BITRATE,
			framerate: 60,
			latencyMode: 'realtime',
		});
		this.needKeyframe = true;
	}

	private sendChunk(chunk: EncodedVideoChunk): void {
		if (this.channel.readyState !== 'open') return;
		const data = new Uint8Array(chunk.byteLength);
		chunk.copyTo(data);
		const payloadPerMessage = MAX_MESSAGE_BYTES - HEADER_BYTES;
		let offset = 0;
		do {
			const end = Math.min(offset + payloadPerMessage, data.length);
			const message = new Uint8Array(HEADER_BYTES + (end - offset));
			let flags = 0;
			if (chunk.type === 'key') flags |= FLAG_KEY;
			if (offset === 0) flags |= FLAG_START;
			if (end === data.length) flags |= FLAG_END;
			message[0] = MAGIC;
			message[1] = flags;
			new DataView(message.buffer).setFloat64(2, chunk.timestamp);
			message.set(data.subarray(offset, end), HEADER_BYTES);
			this.channel.send(message);
			offset = end;
		} while (offset < data.length);
	}
}
