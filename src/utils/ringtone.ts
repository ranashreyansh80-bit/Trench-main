/**
 * Zomato-Style Delivery Order Ringing Alert Controller (Web Audio API)
 * Plays a distinct, urgent repeating two-tone chime melody + device vibration
 * whenever an incoming delivery order popup is active.
 */

class DeliveryOrderRingtoneManager {
  private audioCtx: AudioContext | null = null;
  private intervalId: number | null = null;
  private isRingingState: boolean = false;
  private isMutedState: boolean = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * Plays a single Zomato-style urgent 3-note ascending chime burst
   */
  public playSingleBurst(): void {
    if (this.isMutedState) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Urgent Zomato-inspired sequence: E5 -> G#5 -> B5 -> E6 double pulse
      const notes = [
        { freq: 659.25, start: 0.0, duration: 0.14 },
        { freq: 830.61, start: 0.16, duration: 0.14 },
        { freq: 987.77, start: 0.32, duration: 0.16 },
        { freq: 1318.51, start: 0.50, duration: 0.24 },
        { freq: 1318.51, start: 0.80, duration: 0.28 },
      ];

      for (const note of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, now + note.start);

        gain.gain.setValueAtTime(0.001, now + note.start);
        gain.gain.exponentialRampToValueAtTime(0.28, now + note.start + 0.02);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          now + note.start + note.duration
        );

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + note.start);
        osc.stop(now + note.start + note.duration + 0.02);
      }

      if (
        typeof navigator !== 'undefined' &&
        typeof navigator.vibrate === 'function' &&
        (navigator as any).userActivation?.hasBeenActive
      ) {
        navigator.vibrate([220, 100, 220]);
      }
    } catch {
      // Ignore autoplay policy restriction until user interacts
    }
  }

  /**
   * Starts continuous ringing loop every 1.6 seconds while the popup is visible
   */
  public startRinging(): void {
    if (this.isRingingState) return;
    this.isRingingState = true;

    this.playSingleBurst();
    if (typeof window !== 'undefined') {
      this.intervalId = window.setInterval(() => {
        if (!this.isRingingState) {
          this.stopRinging();
          return;
        }
        this.playSingleBurst();
      }, 1600);
    }
  }

  /**
   * Stops the continuous ringing loop immediately
   */
  public stopRinging(): void {
    this.isRingingState = false;
    if (this.intervalId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function' &&
      (navigator as any).userActivation?.hasBeenActive
    ) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore
      }
    }
  }

  public setMuted(muted: boolean): void {
    this.isMutedState = muted;
    if (
      muted &&
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function' &&
      (navigator as any).userActivation?.hasBeenActive
    ) {
      try {
        navigator.vibrate(0);
      } catch {
        // Ignore
      }
    } else if (!muted && this.isRingingState) {
      this.playSingleBurst();
    }
  }

  public isMuted(): boolean {
    return this.isMutedState;
  }

  public isRinging(): boolean {
    return this.isRingingState;
  }
}

export const deliveryOrderRingtone = new DeliveryOrderRingtoneManager();
