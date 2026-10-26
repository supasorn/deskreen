import DesktopCapturerSourceType from '../../../../common/DesktopCapturerSourceType';
import getDesktopSourceStreamBySourceID from './getDesktopSourceStreamBySourceID';
import prepareDataMessageToSendScreenSourceType from './prepareDataMessageToSendScreenSourceType';
import NullSimplePeer from './NullSimplePeer';
import WebCodecsSender, { isWebCodecsSendSupported } from './webCodecsSender';

// the viewer asked for the low-latency WebCodecs path: stream over the data
// channel and stop WebRTC's own video sender so frames aren't encoded twice
function startWebCodecs(peerConnection: PeerConnection): void {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const peer = peerConnection.peer as any;
	const channel = peer._channel as RTCDataChannel | undefined;
	const track = peerConnection.localStream?.getVideoTracks()[0];
	if (peerConnection.webCodecsSender || !channel || !track) return;
	if (!isWebCodecsSendSupported()) return;
	peerConnection.webCodecsSender = new WebCodecsSender(channel);
	peerConnection.webCodecsSender.start(track);
	(peer._pc as RTCPeerConnection | undefined)
		?.getSenders()
		.forEach((sender) => {
			if (sender.track?.kind === 'video') {
				void sender.replaceTrack(null);
			}
		});
}

export default async function handlePeerOnData(
	peerConnection: PeerConnection,
	data: string,
): Promise<void> {
	const dataJSON = JSON.parse(data);

	if (dataJSON.type === 'start_webcodecs') {
		startWebCodecs(peerConnection);
		return;
	}

	if (dataJSON.type === 'webcodecs_keyframe') {
		peerConnection.webCodecsSender?.requestKeyframe();
		return;
	}

	// quality changes re-capture the WebRTC track, which WebCodecs doesn't use
	if (
		dataJSON.type === 'set_video_quality' &&
		!peerConnection.webCodecsSender
	) {
		const maxVideoQualityMultiplier = dataJSON.payload.value;
		const minVideoQualityMultiplier =
			maxVideoQualityMultiplier === 1 ? 0.5 : maxVideoQualityMultiplier;

		if (
			!peerConnection.desktopCapturerSourceID.includes(
				DesktopCapturerSourceType.SCREEN,
			)
		)
			return;

		const newStream = await getDesktopSourceStreamBySourceID(
			peerConnection.desktopCapturerSourceID,
			peerConnection.sourceDisplaySize?.width,
			peerConnection.sourceDisplaySize?.height,
			minVideoQualityMultiplier,
			maxVideoQualityMultiplier,
			60,
			60,
		);
		const newVideoTrack = newStream.getVideoTracks()[0];
		const oldStream = peerConnection.localStream;
		const oldTrack = oldStream?.getVideoTracks()[0];

		if (oldTrack && oldStream && peerConnection.peer !== NullSimplePeer) {
			await peerConnection.peer.replaceTrack(
				oldTrack,
				newVideoTrack,
				oldStream,
			);
			// stop only the old track (it's already removed from the stream by replaceTrack)
			oldTrack.stop();
			// stop any remaining tracks in the old stream, but don't stop the new track
			oldStream.getTracks().forEach((track) => {
				if (track.id !== newVideoTrack.id) {
					track.stop();
				}
			});
		}

		// update local stream reference to new stream
		peerConnection.localStream = newStream;
	}

	if (dataJSON.type === 'get_sharing_source_type') {
		const sourceType = peerConnection.desktopCapturerSourceID.includes(
			DesktopCapturerSourceType.SCREEN,
		)
			? DesktopCapturerSourceType.SCREEN
			: DesktopCapturerSourceType.WINDOW;

		peerConnection.peer.send(
			prepareDataMessageToSendScreenSourceType(sourceType),
		);
	}
}
