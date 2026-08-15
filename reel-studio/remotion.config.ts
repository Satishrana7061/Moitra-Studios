import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);

// 1080x1920 @ 30fps, H.264. CRF 18 rather than the pipeline's current 23:
// platform re-encoding is lossy, so the upload should be visibly cleaner than
// the target quality, not equal to it.
Config.setCodec('h264');
Config.setCrf(18);
Config.setPixelFormat('yuv420p');

// GitHub Actions runners have no GPU. 'angle' maps onto SwiftShader there and
// is the combination Remotion documents for headless CI.
Config.setChromiumOpenGlRenderer('angle');
