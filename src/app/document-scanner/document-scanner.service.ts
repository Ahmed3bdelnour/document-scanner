import { Injectable } from '@angular/core';

declare const cv: any;

enum FacingMode {
  user = 'user',
  environment = 'environment',
}

@Injectable({
  providedIn: 'root',
})
export class DocumentScannerService {
  isStreaming = false;
  currentStream: MediaStream | null = null;

  constructor() {}

  stopCamera = () => {
    this.isStreaming = false;

    if (!this.currentStream) return;

    const tracks = this.currentStream.getTracks();

    tracks.forEach((track) => {
      track.stop();
    });
  };

  openCamera = async () => {
    this.isStreaming = true;

    let video = document.getElementById('videoInput') as HTMLVideoElement;
    video.srcObject = null;

    video.width = screen.availWidth;
    video.height = screen.availHeight;

    const constrains = {
      video: { facingMode: FacingMode.environment },
      audio: false,
    };

    this.currentStream = await navigator.mediaDevices.getUserMedia(constrains);
    video.srcObject = this.currentStream;

    video.onloadedmetadata = () => {
      video.play();

      let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
      let dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);
      let cap = new cv.VideoCapture(video);

      const FPS = 60;

      const processVideo = () => {
        try {
          if (!this.isStreaming) {
            // clean and stop.
            src.delete();
            dst.delete();
            return;
          }

          let begin = Date.now();
          // start processing.
          cap.read(src);

          cv.imshow('canvasOutput', src);
          // cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
          // cv.imshow('canvasOutput', dst);

          // schedule the next one.
          let delay = 1000 / FPS - (Date.now() - begin);
          setTimeout(processVideo, delay);
        } catch (err) {
          console.error(err);
        }
      };

      // schedule the first one.
      setTimeout(processVideo, 0);
    };
  };
}
