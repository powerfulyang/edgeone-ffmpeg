import { execa } from 'execa'
import ffmpegPath from 'ffmpeg-static'

export default async function onRequest() {
    console.log('ffmpegPath:', ffmpegPath);
    if (!ffmpegPath) {
        return new Response('ffmpegPath is null', { status: 500 });
    }
    try {
        // 使用 execa 更好地处理参数和路径
        const { stdout, stderr } = await execa(ffmpegPath as unknown as string, ['-version']);
        return new Response(stdout || stderr, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });
    } catch (error: any) {
        console.error('FFmpeg execution error:', error);
        return new Response(error.stderr?.toString() || error.message, {
            status: 500,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });
    }
}

