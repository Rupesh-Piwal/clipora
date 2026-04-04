import { useEffect, useRef, useCallback } from "react";

export function useMicLevel(stream: MediaStream | null) {
    const levelRef = useRef(0);
    const smoothedRef = useRef(0);
    const animFrameRef = useRef<number | undefined>(undefined);
    const audioCtxRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const barRef = useRef<HTMLDivElement | null>(null);
    const glowRef = useRef<HTMLDivElement | null>(null);

    const setBarRef = useCallback((el: HTMLDivElement | null) => {
        barRef.current = el;
    }, []);


    const setGlowRef = useCallback((el: HTMLDivElement | null) => {
        glowRef.current = el;
    }, []);


    useEffect(() => {
        if (!stream) {
            smoothedRef.current = 0;
            levelRef.current = 0;
            if (barRef.current) {
                barRef.current.style.transform = "scaleX(0)";
            }
            return;
        }

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) return;

        let cancelled = false;

        const init = () => {
            try {
                const Ctx = window.AudioContext || (window as any).webkitAudioContext;
                const ctx = new Ctx();
                audioCtxRef.current = ctx;

                const analyser = ctx.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.3;
                analyserRef.current = analyser;

                const source = ctx.createMediaStreamSource(stream);
                source.connect(analyser);
                sourceRef.current = source;

                const dataArray = new Uint8Array(analyser.frequencyBinCount);

                const tick = () => {
                    if (cancelled || !analyserRef.current) return;

                    analyserRef.current.getByteTimeDomainData(dataArray);


                    let sum = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        const sample = (dataArray[i] - 128) / 128;
                        sum += sample * sample;
                    }
                    const rms = Math.sqrt(sum / dataArray.length);


                    const raw = Math.min(1, rms * 5);


                    smoothedRef.current = smoothedRef.current * 0.8 + raw * 0.2;
                    levelRef.current = smoothedRef.current;


                    if (barRef.current) {
                        barRef.current.style.transform = `scaleX(${smoothedRef.current})`;
                    }


                    if (glowRef.current) {
                        if (smoothedRef.current > 0.35) {
                            glowRef.current.style.boxShadow = `0 0 8px rgba(16,185,129,${0.4 + smoothedRef.current * 0.4})`;
                        } else {
                            glowRef.current.style.boxShadow = "none";
                        }
                    }

                    animFrameRef.current = requestAnimationFrame(tick);
                };

                tick();
            } catch (err) {
                console.error("[useMicLevel] Failed to init AudioContext:", err);
            }
        };

        init();

        return () => {
            cancelled = true;
            if (animFrameRef.current !== undefined) {
                cancelAnimationFrame(animFrameRef.current);
                animFrameRef.current = undefined;
            }
            if (sourceRef.current) {
                sourceRef.current.disconnect();
                sourceRef.current = null;
            }
            if (audioCtxRef.current) {
                audioCtxRef.current.close().catch(() => { });
                audioCtxRef.current = null;
            }
            analyserRef.current = null;
            smoothedRef.current = 0;
            levelRef.current = 0;
        };
    }, [stream]);

    return { levelRef, setBarRef, setGlowRef };
}
