import { execa } from 'execa';
import ffmpegPath from 'ffmpeg-static';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';


export default async function onRequest(context: any) {
    const request: Request = context.request || context;

    if (request.method !== 'POST') {
        return new Response('Method Not Allowed, please use POST', { status: 405 });
    }

    let assContent = '';
    try {
        assContent = await request.text();
    } catch (e) {
        return new Response('Failed to read request body', { status: 400 });
    }

    if (!assContent || assContent.trim() === '') {
        return new Response('Empty ASS content', { status: 400 });
    }

    if (!ffmpegPath) {
        return new Response('ffmpegPath is null', { status: 500 });
    }

    const uniqueId = crypto.randomUUID();
    const workDir = path.join(os.tmpdir(), `render-ass_${uniqueId}`);
    const assFilePath = path.join(workDir, 'subs.ass');
    const outputFilePath = path.join(workDir, 'out.png');

    try {
        // 0. 创建工作目录
        await fs.mkdir(workDir, { recursive: true });

        // 1. 将 ASS 内容写入临时文件
        await fs.writeFile(assFilePath, assContent, 'utf-8');
        console.log(assContent);

        // 2. 准备 ffmpeg 命令，使用一个透明/黑色的背景，时长 1 帧
        // 使用 1920x1080 尺寸的透明背景
        const ffmpegArgs = [
            '-f', 'lavfi',
            '-i', 'color=c=white@0:s=1920x1080:d=1',
            '-vf', 'ass=subs.ass', // 使用相对路径避免 Windows 盘符冒号问题
            '-frames:v', '1',
            '-y', // 覆盖已有文件
            'out.png'
        ];

        console.log('Running ffmpeg with args:', ffmpegArgs, 'in', workDir);

        // 3. 执行 ffmpeg 生成图片
        await execa(ffmpegPath as unknown as string, ffmpegArgs, { cwd: workDir });

        // 4. 读取生成的图片并返回
        const imageBuffer = await fs.readFile(outputFilePath);

        return new Response(imageBuffer, {
            headers: {
                'Content-Type': 'image/png',
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
    } finally {
        // 5. 清理整个工作目录
        try {
            await fs.rm(workDir, { recursive: true, force: true }).catch(() => { });
        } catch (e) { }
    }
}
