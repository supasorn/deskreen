import {
	prepareDataMessageToChangeQuality,
	prepareDataMessageToGetSharingSourceType,
} from './simplePeerDataMessages';
import { VideoQuality } from '../VideoAutoQualityOptimizer/VideoQualityEnum';
import { ErrorMessage } from '../../components/ErrorDialog/ErrorMessageEnum';
import PeerConnectionPeerIsNullError from './errors/PeerConnectionPeerIsNullError';
import { ScreenSharingSource } from './ScreenSharingSourceEnum';
import WebCodecsReceiver, {
	getPlayoutBufferMs,
	isWebCodecsMessage,
	isWebCodecsReceiveSupported,
} from './webCodecsReceiver';

export function getSharingShourceType(peerConnection: PeerConnection) {
	try {
		peerConnection.peer?.send(prepareDataMessageToGetSharingSourceType());
	} catch (e) {
		console.log(e);
	}
}

function handleStreamStarted(
	peerConnection: PeerConnection,
	stream: MediaStream,
): void {
	if (peerConnection.isStreamStarted) {
		// switching from the WebRTC stream to the WebCodecs one
		peerConnection.setUrlCallback(stream);
		return;
	}
	peerConnection.setUrlCallback(stream);

	setTimeout(() => {
		peerConnection.videoAutoQualityOptimizer.setGoodQualityCallback(() => {
			if (peerConnection.videoQuality === VideoQuality.Q_AUTO) {
				try {
					peerConnection.peer?.send(prepareDataMessageToChangeQuality(1));
				} catch (e) {
					console.log(e);
				}
			}
		});

		peerConnection.videoAutoQualityOptimizer.setHalfQualityCallbak(() => {
			if (peerConnection.videoQuality === VideoQuality.Q_AUTO) {
				try {
					peerConnection.peer?.send(prepareDataMessageToChangeQuality(0.5));
				} catch (e) {
					console.log(e);
				}
			}
		});
	}, 1000);

	peerConnection.videoAutoQualityOptimizer.startOptimizationLoop();

	setTimeout(getSharingShourceType, 1000, peerConnection);

	peerConnection.isStreamStarted = true;

	// if any transient error dialog was shown earlier, close it now
	try {
		peerConnection.UIHandler.setIsErrorDialogOpen(false);
		peerConnection.UIHandler.errorDialogMessage = ErrorMessage.UNKNOWN_ERROR;
	} catch (_) {
		// ignore
	}
}

export default (peerConnection: PeerConnection) => {
	if (peerConnection.peer === null) {
		throw new PeerConnectionPeerIsNullError();
	}
	peerConnection.peer.on('stream', (stream) => {
		// already showing the low-latency WebCodecs stream
		if (peerConnection.isWebCodecsActive) return;
		handleStreamStarted(peerConnection, stream);
	});

	peerConnection.peer.on('connect', () => {
		if (!isWebCodecsReceiveSupported()) return;
		peerConnection.webCodecsReceiver = new WebCodecsReceiver(
			(stream) => {
				peerConnection.isWebCodecsActive = true;
				handleStreamStarted(peerConnection, stream);
			},
			() => {
				try {
					peerConnection.peer?.send(
						JSON.stringify({ type: 'webcodecs_keyframe' }),
					);
				} catch (e) {
					console.log(e);
				}
			},
			getPlayoutBufferMs(),
		);
		try {
			peerConnection.peer?.send(JSON.stringify({ type: 'start_webcodecs' }));
		} catch (e) {
			console.log(e);
		}
	});

	peerConnection.peer.on('signal', (data) => {
		// fired when webrtc done preparation to start call on peerConnection machine
		peerConnection.sendEncryptedMessage({
			type: 'CALL_ACCEPTED',
			payload: {
				signalData: data,
			},
		});
	});

	peerConnection.peer.on('data', (data) => {
		if (isWebCodecsMessage(data)) {
			peerConnection.webCodecsReceiver?.handleMessage(data);
			return;
		}
		const dataJSON = JSON.parse(data);

		if (dataJSON.type === 'screen_sharing_source_type') {
			peerConnection.screenSharingSourceType = dataJSON.payload.value;
			if (
				peerConnection.screenSharingSourceType === ScreenSharingSource.SCREEN ||
				peerConnection.screenSharingSourceType === ScreenSharingSource.WINDOW
			) {
				peerConnection.UIHandler.setScreenSharingSourceTypeCallback(
					peerConnection.screenSharingSourceType,
				);
			}
		}
	});
};
