import { Component, OnInit } from '@angular/core';
declare const cv: any;

@Component({
  selector: 'app-document-scanner',
  templateUrl: './document-scanner.component.html',
  styleUrls: ['./document-scanner.component.scss'],
})
export class DocumentScannerComponent implements OnInit {
  cameraStreaming = false;

  get screenWidth() {
    return screen.availWidth;
  }

  get screenHeight() {
    return screen.availHeight;
  }

  constructor() {}

  ngOnInit() {}

  scanDocument() {
    this.cameraStreaming = true;

    setTimeout(() => {
      const video = document.getElementById('videoInput') as HTMLVideoElement;
      const src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
      const dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);
      const cap = new cv.VideoCapture(video);
      this.processVideo(src, dst, cap);
    }, 0);
  }

  processVideo(src: any, dst: any, cap: any) {
    const FPS = 30;

    try {
      if (!this.cameraStreaming) {
        src.delete();
        dst.delete();
        return;
      }

      const begin = Date.now();
      // start processing.
      cap.read(src);
      cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
      cv.imshow('canvasOutput', dst);
      // schedule the next one.
      let delay = 1000 / FPS - (Date.now() - begin);
      setTimeout(() => this.processVideo(src, dst, cap), delay);
    } catch (err: any) {
      console.error('Failed to open Camera: ' + err.message);
    }
  }

  captureImage() {
    this.cameraStreaming = false;
  }
}
