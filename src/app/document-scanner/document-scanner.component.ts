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

    let video = document.getElementById('videoInput') as HTMLVideoElement;
    let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    let dst = new cv.Mat(video.height, video.width, cv.CV_8UC1);
    let cap = new cv.VideoCapture(video);

    const FPS = 30;

    const processVideo = () => {
      try {
        if (!this.cameraStreaming) {
          // clean and stop.
          src.delete();
          dst.delete();
          return;
        }
        let begin = Date.now();
        // start processing.
        cap.read(src);
        cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY);
        cv.imshow('canvasOutput', dst);
        // schedule the next one.
        let delay = 1000 / FPS - (Date.now() - begin);
        setTimeout(processVideo, delay);
      } catch (err) {
        console.error(err);
      }
    };

    // schedule the first one.
    setTimeout(processVideo, 0);
  }

  captureImage() {
    this.cameraStreaming = false;
  }
}
