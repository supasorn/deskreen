let host;
let protocol;
let port;

if (!host && !protocol && !port) {
	host = window.location.host.split(':')[0];
	// follow the page: the viewer is served over HTTPS (needed for WebCodecs)
	protocol = window.location.protocol.replace(':', '');
	port = window.location.port || 3131;
}

export default {
	host,
	port,
	protocol,
};
