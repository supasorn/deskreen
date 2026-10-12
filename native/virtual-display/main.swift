// Creates a virtual display (like DeskPad) that lives as long as this process.
//
// Usage: virtual-display [WIDTHxHEIGHT] [--hidpi]
// WIDTHxHEIGHT is the initial size; common sizes are offered as extra modes.
// Prints "DISPLAY_ID=<id>" on stdout once the display exists. Exits (removing
// the display) on SIGTERM/SIGINT or when stdin closes, i.e. when the parent
// process goes away.

import CoreGraphics
import Foundation

var width: UInt32 = 1920
var height: UInt32 = 1080
var hiDPI = false

for arg in CommandLine.arguments.dropFirst() {
	if arg == "--hidpi" {
		hiDPI = true
		continue
	}
	let parts = arg.lowercased().split(separator: "x").compactMap { UInt32($0) }
	guard parts.count == 2, parts[0] > 0, parts[1] > 0 else {
		FileHandle.standardError.write("invalid argument: \(arg)\n".data(using: .utf8)!)
		exit(2)
	}
	width = parts[0]
	height = parts[1]
}

// Offer common resolutions so the size can be changed in System Settings >
// Displays while running. The requested size comes first: it is the default.
let commonSizes: [(UInt32, UInt32)] = [
	(1280, 720), (1440, 900), (1600, 900), (1680, 1050), (1920, 1080),
	(1920, 1200), (2560, 1440), (2560, 1600), (3200, 1800), (3840, 2160),
]
let sizes = [(width, height)] + commonSizes.filter { $0 != (width, height) }

// hiDPI renders at 2x the logical size
let scale: UInt32 = hiDPI ? 2 : 1
let maxWidth = sizes.map { $0.0 }.max()!
let maxHeight = sizes.map { $0.1 }.max()!

let descriptor = CGVirtualDisplayDescriptor()
descriptor.queue = DispatchQueue.main
descriptor.name = "Deskreen Virtual Display"
descriptor.maxPixelsWide = maxWidth * scale
descriptor.maxPixelsHigh = maxHeight * scale
// ~24" diagonal at 16:9 so macOS picks sensible UI scaling
descriptor.sizeInMillimeters = CGSize(
	width: 531, height: 531 * Double(height) / Double(width))
descriptor.vendorID = 0x3456
descriptor.productID = 0x1234
descriptor.serialNum = 0x0001
descriptor.terminationHandler = { _, _ in
	exit(0)
}

guard let display = CGVirtualDisplay(descriptor: descriptor) else {
	FileHandle.standardError.write("failed to create virtual display\n".data(using: .utf8)!)
	exit(1)
}
let settings = CGVirtualDisplaySettings()
settings.hiDPI = hiDPI ? 1 : 0
settings.modes = sizes.map {
	CGVirtualDisplayMode(width: $0.0, height: $0.1, refreshRate: 60)
}
guard display.apply(settings) else {
	FileHandle.standardError.write("failed to apply virtual display settings\n".data(using: .utf8)!)
	exit(1)
}

print("DISPLAY_ID=\(display.displayID)")
fflush(stdout)

// report resolution changes (e.g. from System Settings > Displays). Polled:
// reconfiguration callbacks aren't delivered to this windowless process.
let displayID = display.displayID
var lastSize = CGDisplayBounds(displayID).size
let resolutionTimer = Timer(timeInterval: 0.5, repeats: true) { _ in
	let size = CGDisplayBounds(displayID).size
	guard size != lastSize, size.width > 0 else { return }
	lastSize = size
	print("RESOLUTION=\(Int(size.width))x\(Int(size.height))")
	fflush(stdout)
}
RunLoop.main.add(resolutionTimer, forMode: .default)

var signalSources: [DispatchSourceSignal] = []
for sig in [SIGTERM, SIGINT] {
	signal(sig, SIG_IGN)
	let source = DispatchSource.makeSignalSource(signal: sig, queue: .main)
	source.setEventHandler { exit(0) }
	source.resume()
	signalSources.append(source)
}

// stdin reaching EOF means the parent died without signalling us
FileHandle.standardInput.readabilityHandler = { handle in
	if handle.availableData.isEmpty {
		exit(0)
	}
}

// keep the display object alive for the life of the process
withExtendedLifetime(display) {
	RunLoop.main.run()
}
