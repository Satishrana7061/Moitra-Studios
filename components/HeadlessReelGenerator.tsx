import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { dynamicCampaignService } from '../services/dynamicCampaignService';

// This is a hidden route /headless-reel/:id optimized for Puppeteer
// It exposes window.generateReelBase64() which the backend calls.
const HeadlessReelGenerator: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [campaign, setCampaign] = useState<any>(null);
    const [status, setStatus] = useState('initializing');

    useEffect(() => {
        if (id) {
            dynamicCampaignService.getCampaignBySlug(id).then(c => {
                setCampaign(c);
                setStatus('ready');
            });
        }
    }, [id]);

    useEffect(() => {
        // Expose function for Puppeteer
        (window as any).generateReelBase64 = async (audioUrl?: string) => {
            return new Promise(async (resolve, reject) => {
                if (!campaign) return reject("Campaign not loaded");
                const canvas = canvasRef.current;
                if (!canvas) return reject("No canvas");

                setStatus('recording');

                const ctx = canvas.getContext('2d', { alpha: false });
                if (!ctx) return reject("No 2d context");

                canvas.width = 1080;
                canvas.height = 1920;

                const stream = canvas.captureStream(30);

                // If audioUrl is provided (ElevenLabs MP3), merge it into the stream
                const audioCtx = new AudioContext();
                const dest = audioCtx.createMediaStreamDestination();
                
                if (audioUrl) {
                    try {
                        const response = await fetch(audioUrl);
                        const arrayBuffer = await response.arrayBuffer();
                        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
                        
                        const source = audioCtx.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(dest);
                        source.start();
                    } catch (err) {
                        console.error("Audio mix failed", err);
                    }
                }

                // Combine video and audio tracks
                const combinedStream = new MediaStream([
                    ...stream.getVideoTracks(),
                    ...dest.stream.getAudioTracks()
                ]);

                // Force MP4 encoding for Instagram
                let mimeType = 'video/mp4;codecs=avc1,mp4a.40.2';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'video/webm;codecs=vp9'; // Fallback, backend ffmpeg might be needed
                }

                const recorder = new MediaRecorder(combinedStream, { mimeType, videoBitsPerSecond: 4_000_000 });
                const chunks: Blob[] = [];
                recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: mimeType });
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result); // Base64 Data URL
                    reader.readAsDataURL(blob);
                    setStatus('done');
                };

                const SLIDE_DURATION_MS = 3500;
                const FPS = 30;
                const FRAMES_PER_SLIDE = Math.round((SLIDE_DURATION_MS / 1000) * FPS);

                const wrapText = (text: string, x: number, y: number, maxW: number, lineH: number) => {
                    const words = text.split(' ');
                    let line = '';
                    let cy = y;
                    for (const word of words) {
                        const test = line + word + ' ';
                        if (ctx.measureText(test).width > maxW && line) {
                            ctx.fillText(line.trim(), x, cy);
                            line = word + ' ';
                            cy += lineH;
                        } else { line = test; }
                    }
                    if (line) ctx.fillText(line.trim(), x, cy);
                    return cy;
                };

                const modiApproach = campaign.approaches?.find((a:any) => a.style === 'modi');
                const rahulApproach = campaign.approaches?.find((a:any) => a.style === 'rahul');

                const slides = [
                    {
                        label: 'THE DEBATE',
                        color: '#6366f1', accent: '#818cf8',
                        bullets: (campaign.issue_bullets || []).slice(0, 4),
                        intro: campaign.issue_summary?.slice(0, 200) || campaign.title,
                    },
                    {
                        label: "MODI'S APPROACH",
                        color: '#ea580c', accent: '#fb923c',
                        bullets: (modiApproach?.policy_bullets || []).slice(0, 4),
                        intro: '',
                    },
                    {
                        label: "RAHUL'S APPROACH",
                        color: '#2563eb', accent: '#60a5fa',
                        bullets: (rahulApproach?.policy_bullets || []).slice(0, 4),
                        intro: '',
                    },
                ];

                recorder.start();

                for (let si = 0; si < slides.length; si++) {
                    const slide = slides[si];
                    for (let f = 0; f < FRAMES_PER_SLIDE; f++) {
                        const progress = f / FRAMES_PER_SLIDE;

                        const grad = ctx.createLinearGradient(0, 0, 0, 1920);
                        grad.addColorStop(0, '#09090f');
                        grad.addColorStop(1, '#0d0d1c');
                        ctx.fillStyle = grad;
                        ctx.fillRect(0, 0, 1080, 1920);

                        ctx.fillStyle = slide.color;
                        ctx.fillRect(0, 0, 1080, 10);

                        ctx.fillStyle = slide.color + '22';
                        ctx.beginPath();
                        ctx.roundRect(80, 80, 400, 60, 30);
                        ctx.fill();
                        ctx.fillStyle = slide.color;
                        ctx.font = 'bold 30px Arial';
                        ctx.textAlign = 'left';
                        ctx.fillText(slide.label, 110, 120);

                        ctx.strokeStyle = slide.accent + '33';
                        ctx.lineWidth = 1.5;
                        ctx.beginPath(); ctx.moveTo(80, 165); ctx.lineTo(1000, 165); ctx.stroke();

                        ctx.fillStyle = '#ffffff';
                        ctx.font = 'bold 56px Arial';
                        ctx.textAlign = 'center';
                        const titleEndY = wrapText(campaign.title, 540, 250, 940, 70);

                        let contentStartY = titleEndY + 60;
                        if (slide.intro) {
                            ctx.fillStyle = 'rgba(148,163,184,0.9)';
                            ctx.font = '34px Arial';
                            contentStartY = wrapText(slide.intro, 540, contentStartY, 900, 48) + 70;
                        }

                        const visibleBullets = Math.min(slide.bullets.length, Math.ceil(progress * (slide.bullets.length + 1)));
                        let bulletY = contentStartY;
                        ctx.textAlign = 'left';
                        for (let bi = 0; bi < visibleBullets; bi++) {
                            const bullet = slide.bullets[bi];
                            if (!bullet) continue;
                            const alpha = bi < visibleBullets - 1 ? 1 : progress;

                            ctx.fillStyle = slide.accent;
                            ctx.beginPath();
                            ctx.arc(100, bulletY - 10, 8, 0, Math.PI * 2);
                            ctx.fill();

                            ctx.fillStyle = `rgba(226,232,240,${alpha})`;
                            ctx.font = '36px Arial';
                            bulletY = wrapText(String(bullet), 128, bulletY, 870, 50) + 65;
                        }

                        for (let d = 0; d < slides.length; d++) {
                            ctx.fillStyle = d === si ? slide.accent : '#2a2a3a';
                            ctx.beginPath();
                            ctx.arc(540 + (d - 1) * 44, 1840, d === si ? 13 : 8, 0, Math.PI * 2);
                            ctx.fill();
                        }

                        ctx.fillStyle = 'rgba(255,255,255,0.12)';
                        ctx.font = 'bold 26px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText('RAJNEETI.IN · SOCIAL CAMPAIGN', 540, 1900);

                        await new Promise(r => setTimeout(r, 0));
                    }
                }

                recorder.stop();
            });
        };
    }, [campaign]);

    return (
        <div style={{ background: '#000', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h1 style={{ color: 'white' }}>Headless Reel Generator</h1>
            <p style={{ color: 'white' }}>Status: <span id="status">{status}</span></p>
            <canvas ref={canvasRef} style={{ width: '270px', height: '480px', border: '1px solid #333' }} />
        </div>
    );
};

export default HeadlessReelGenerator;
