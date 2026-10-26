// Chrome's bandwidth estimate starts low and only ramps up while it has data to
// probe with, so on a mostly static screen it stays at a few Mbps and a sudden
// big change (scrolling) gets queued in the sender's pacer for hundreds of ms.
// On a LAN we can afford a high floor. These x-google-* codec params are read
// by Chrome's sender from the negotiated (answer) SDP; other browsers ignore them.
const VIDEO_CODECS = ['H264', 'VP8', 'VP9', 'AV1'];

export default (sdp: string, minKbps: number, startKbps: number): string => {
	const params = `x-google-min-bitrate=${minKbps};x-google-start-bitrate=${startKbps}`;
	const lines = sdp.split('\r\n');
	const result: string[] = [];
	let inVideo = false;
	const videoPayloadTypes = new Set<string>();
	const payloadTypesWithFmtp = new Set<string>();

	// first pass: collect video payload types and which already have fmtp lines
	lines.forEach((line) => {
		if (line.startsWith('m=')) inVideo = line.startsWith('m=video');
		if (!inVideo) return;
		const rtpmap = line.match(/^a=rtpmap:(\d+) ([\w-]+)\//);
		if (rtpmap && VIDEO_CODECS.includes(rtpmap[2])) videoPayloadTypes.add(rtpmap[1]);
		const fmtp = line.match(/^a=fmtp:(\d+) /);
		if (fmtp) payloadTypesWithFmtp.add(fmtp[1]);
	});

	inVideo = false;
	lines.forEach((line) => {
		if (line.startsWith('m=')) inVideo = line.startsWith('m=video');
		const fmtp = inVideo && line.match(/^a=fmtp:(\d+) /);
		if (fmtp && videoPayloadTypes.has(fmtp[1])) {
			result.push(`${line};${params}`);
			return;
		}
		result.push(line);
		const rtpmap = inVideo && line.match(/^a=rtpmap:(\d+) /);
		if (rtpmap && videoPayloadTypes.has(rtpmap[1]) && !payloadTypesWithFmtp.has(rtpmap[1])) {
			result.push(`a=fmtp:${rtpmap[1]} ${params}`);
		}
	});
	return result.join('\r\n');
};
