import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, fromEvent, take } from 'rxjs';
import { jscanify } from './model';

@Component({
  selector: 'app-jscannify-document-scanner',
  templateUrl: './jscannify-document-scanner.component.html',
  styleUrls: ['./jscannify-document-scanner.component.scss'],
})
export class JscannifyDocumentScannerComponent implements OnInit, OnDestroy {
  // @ts-ignore
  video: HTMLVideoElement;
  stream: MediaStream | null = null;
  frameRate = 30;
  scanner = new jscanify();

  subscriptions = new Subscription();

  constructor() {}

  ngOnInit() {}

  ngAfterViewInit(): void {
    this.video = document.getElementById('video')! as HTMLVideoElement;

    // TODO: handle Idle user

    this.subscriptions.add(
      fromEvent(document, 'visibilitychange').subscribe(() => {
        if (document.visibilityState === 'visible') {
          console.log('Resume capturing frames or take other actions');

          try {
            this.video.play();
          } catch (error) {
            console.error(error);
          }
        } else {
          console.log('Pause capturing frames or take other actions');
          this.video.pause();
        }
      })
    );

    this.subscriptions.add(
      fromEvent(this.video, 'play').subscribe(() => {
        console.log('The video is playing.');
        setTimeout(this.processVideo, 0);
      })
    );

    this.subscriptions.add(
      fromEvent(this.video, 'pause').subscribe(() => {
        console.log('The video has been paused.');
      })
    );

    this.openCamera();
  }

  openCamera = () => {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'environment',
          frameRate: { exact: this.frameRate },
        },
        audio: false,
      })
      .then((stream) => {
        this.video.srcObject = stream;
        this.stream = stream;

        fromEvent(this.video, 'canplay')
          .pipe(take(1))
          .subscribe(() => {
            this.video.play();
          });
      })
      .catch((error) => console.log('Failed to open camera: ' + error));
  };

  processVideo = () => {
    if (!this.video || !this.video.srcObject || this.video.paused) return;

    console.log('highlight interval is playing...');

    const startProcessingTime = Date.now();

    const canvas = document.getElementById('canvas')! as HTMLCanvasElement;
    const result = document.getElementById('result')! as HTMLCanvasElement;

    if (this.video && canvas && result) {
      const canvasCtx = canvas.getContext('2d', { willReadFrequently: true })!;
      const resultCtx = result.getContext('2d', { willReadFrequently: true })!;

      canvasCtx.drawImage(this.video, 0, 0);

      try {
        const resultCanvas = this.scanner.highlightPaper(canvas, {
          color: 'yellow',
          thickness: 1.5,
        });

        resultCtx.drawImage(resultCanvas, 0, 0);
      } catch (error) {
        console.error(error);
        return;
      }
    }

    setTimeout(
      this.processVideo,
      1000 / this.frameRate - (Date.now() - startProcessingTime)
    );
  };

  stopCamera = () => {
    if (this.video) {
      const stream = this.video.srcObject as MediaStream;
      this.video.pause();
      this.video.srcObject = null;

      if (stream) {
        stream.getVideoTracks()[0].stop();
      }
    }
  };

  ngOnDestroy(): void {
    this.stopCamera();
    this.subscriptions.unsubscribe();
  }
}
