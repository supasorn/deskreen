import {
	enterPlayerFullscreen,
	isPlayerFullscreen,
} from '../../utils/playerFullscreen';

type NavigatorWithUserActivation = Navigator & {
	userActivation?: { isActive: boolean };
};

// Browsers only allow fullscreen from a user gesture, so once the stream is
// up: enter right away if a gesture is still active, otherwise on the first
// tap / key press anywhere on the page.
export default (url: MediaStream | null) => {
	return () => {
		if (url === null) return undefined;

		const enterFullscreen = () => {
			if (!isPlayerFullscreen()) {
				enterPlayerFullscreen();
			}
		};

		if ((navigator as NavigatorWithUserActivation).userActivation?.isActive) {
			enterFullscreen();
		}

		const handleFirstInteraction = (event: Event) => {
			// let player controls (e.g. the fullscreen toggle) handle their own taps
			if ((event.target as Element | null)?.closest?.('button')) return;
			removeListeners();
			enterFullscreen();
		};
		const removeListeners = () => {
			document.removeEventListener('pointerup', handleFirstInteraction);
			document.removeEventListener('keydown', handleFirstInteraction);
		};
		document.addEventListener('pointerup', handleFirstInteraction);
		document.addEventListener('keydown', handleFirstInteraction);

		return removeListeners;
	};
};
