const SYMBOLS = [' ', '░', '▒', '▓', '█'];

class SanityCheck {
    constructor(width = 88, height = 36, frameRate = 30) {
        this.width = width
        this.height = height
        this.frameRate = frameRate
        this.bin = null
        this.frames = null
        this.frameCount = 0
    }

    getTime(frame) {
        const totalSeconds = Math.floor(frame / this.frameRate);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    getTotalTime() {
        return this.getTime(this.frameCount - 1)
    }

    _decode(white = true) {
        const data = new Uint8Array(this.bin);
        const frameCount = new DataView(this.bin).getUint16(0, false);
        this.frameCount = frameCount;
        let frames = [];

        let dataIndex = 2;
        let currentByte = 0;
        let availableBits = 0;
        
        const unpackPixels = (pixelCount) => {
            const pixels = [];
            
            while (pixels.length < pixelCount && dataIndex < data.length) {
                if (availableBits < 3) {
                    currentByte = (currentByte << 8) | data[dataIndex];
                    availableBits += 8;
                    dataIndex++;
                }
                
                if (availableBits >= 3) {
                    const pixel = (currentByte >> (availableBits - 3)) & 0b111;
                    pixels.push(pixel);
                    availableBits -= 3;
                    currentByte &= (1 << availableBits) - 1;
                }
            }
            
            return pixels;
        };
        
        for (let frame = 0; frame < frameCount; frame++) {
            const pixels = unpackPixels(this.width * this.height);
            const currentFrame = [];
            
            for (let y = 0; y < this.height; y++) {
                let row = pixels.slice(y * this.width, (y + 1) * this.width).map(pixel => SYMBOLS[pixel]).join('');
                if (white) {
                    if (row.length == this.width) {
                        row = `<span class="text-common">${row}</span>`
                    }
                }
                currentFrame.push(row);
            }
            
            frames.push(currentFrame);
        }
        
        this.frames = frames;
    }

    play(setFrame) {
        let frame = 0
        const interval = setInterval(() => {
            setFrame(frame++)
        }, 1000 / this.frameRate);
        return interval;
    }
    
    async loadVideo() {
        const response = await fetch('/funny/bad_flag.bin')
        const compressedBuffer = await response.arrayBuffer()
        const ds = new DecompressionStream('gzip');
        const decompressedStream = new Response(compressedBuffer).body.pipeThrough(ds);
        const decompressedResponse = new Response(decompressedStream);
        this.bin = await decompressedResponse.arrayBuffer();
        this._decode()
    }

    getFrame(frame) {
        return this.frames[frame]
    }
}

export default SanityCheck