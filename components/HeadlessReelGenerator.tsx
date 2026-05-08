import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { dynamicCampaignService } from '../services/dynamicCampaignService';

// This is a hidden route /#/headless-reel/:id optimized for Puppeteer.
// It exposes window.renderSlide(index) which draws a single slide onto the canvas,
// then Puppeteer takes a screenshot.  ffmpeg stitches the PNGs into an MP4 server-side.
const HeadlessReelGenerator: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [campaign, setCampaign] = useState<any>(null);
    const [status, setStatus] = useState('initializing');
    const [searchParams] = useSearchParams();

    const urlTitle = searchParams.get('title');
    const urlSummary = searchParams.get('summary');

    useEffect(() => {
        if (urlTitle) {
            setCampaign({
                title: urlTitle,
                issue_summary: urlSummary || "Rajneeti political update.",
                issue_bullets: (urlSummary || "").split('. ').filter((s: string) => s.length > 5).slice(0, 4),
                approaches: [
                    { style: "modi", policy_bullets: ["Development focus", "Infrastructure growth"] },
                    { style: "rahul", policy_bullets: ["Social justice", "Grassroots connect"] }
                ]
            });
            setStatus('ready');
        } else if (id) {
            dynamicCampaignService.getCampaignBySlug(id)
                .then(c => {
                    if (c) { setCampaign(c); setStatus('ready'); }
                    else { throw new Error("Empty campaign"); }
                })
                .catch(err => {
                    console.warn("Using mock campaign for testing/fallback", err);
                    setCampaign({
                        title: "Nationwide Infrastructure Drive",
                        issue_summary: "A major push for connectivity across India.",
                        issue_bullets: ["Highway expansion", "Railway modernization", "Digital infrastructure", "Rural connectivity"],
                        approaches: [
                            { style: "modi", policy_bullets: ["PM Gati Shakti focus", "Smart cities mission"] },
                            { style: "rahul", policy_bullets: ["Social justice focus", "Inclusive growth"] }
                        ]
                    });
                    setStatus('ready');
                });
        }
    }, [id, urlTitle, urlSummary]);

    // ── Expose slide-rendering helpers for Puppeteer ──────────────
    useEffect(() => {
        if (!campaign) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        canvas.width = 1080;
        canvas.height = 1920;

        // ── helpers ──────────────────────────────────────────────
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

        const modiApproach = campaign.approaches?.find((a: any) => a.style === 'modi');
        const rahulApproach = campaign.approaches?.find((a: any) => a.style === 'rahul');

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

        // ── renderSlide(index) → draws a full slide with all bullets visible ──
        (window as any).renderSlide = (slideIndex: number) => {
            const slide = slides[slideIndex] || slides[0];

            // Background
            const grad = ctx.createLinearGradient(0, 0, 0, 1920);
            grad.addColorStop(0, '#09090f');
            grad.addColorStop(1, '#0d0d1c');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 1080, 1920);

            // Top accent bar
            ctx.fillStyle = slide.color;
            ctx.fillRect(0, 0, 1080, 10);

            // Label pill
            ctx.fillStyle = slide.color + '22';
            ctx.beginPath();
            ctx.roundRect(80, 80, 400, 60, 30);
            ctx.fill();
            ctx.fillStyle = slide.color;
            ctx.font = 'bold 30px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(slide.label, 110, 120);

            // Divider
            ctx.strokeStyle = slide.accent + '33';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.moveTo(80, 165); ctx.lineTo(1000, 165); ctx.stroke();

            // Title
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 56px Arial';
            ctx.textAlign = 'center';
            const titleEndY = wrapText(campaign.title, 540, 250, 940, 70);

            // Intro
            let contentStartY = titleEndY + 60;
            if (slide.intro) {
                ctx.fillStyle = 'rgba(148,163,184,0.9)';
                ctx.font = '34px Arial';
                contentStartY = wrapText(slide.intro, 540, contentStartY, 900, 48) + 70;
            }

            // Bullets (all visible)
            let bulletY = contentStartY;
            ctx.textAlign = 'left';
            for (let bi = 0; bi < slide.bullets.length; bi++) {
                const bullet = slide.bullets[bi];
                if (!bullet) continue;

                ctx.fillStyle = slide.accent;
                ctx.beginPath();
                ctx.arc(100, bulletY - 10, 8, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'rgba(226,232,240,1)';
                ctx.font = '36px Arial';
                bulletY = wrapText(String(bullet), 128, bulletY, 870, 50) + 65;
            }

            // Dots
            for (let d = 0; d < slides.length; d++) {
                ctx.fillStyle = d === slideIndex ? slide.accent : '#2a2a3a';
                ctx.beginPath();
                ctx.arc(540 + (d - 1) * 44, 1840, d === slideIndex ? 13 : 8, 0, Math.PI * 2);
                ctx.fill();
            }

            // Watermark
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.font = 'bold 26px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('RAJNEETI.IN · SOCIAL CAMPAIGN', 540, 1900);

            return true;
        };

        // Expose the total number of slides
        (window as any).totalSlides = slides.length;

        console.log(`[HeadlessReel] Ready. ${slides.length} slides prepared.`);
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
