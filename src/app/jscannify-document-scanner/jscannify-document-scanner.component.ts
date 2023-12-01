import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, fromEvent } from 'rxjs';
import { jscanify } from './model';

@Component({
  selector: 'app-jscannify-document-scanner',
  templateUrl: './jscannify-document-scanner.component.html',
  styleUrls: ['./jscannify-document-scanner.component.scss'],
})
export class JscannifyDocumentScannerComponent implements OnInit, OnDestroy {
  highlightInterval: any = undefined;

  subscriptions = new Subscription();

  constructor() {}

  ngOnInit() {}

  ngAfterViewInit(): void {
    const scanner = new jscanify();

    const canvas = document.getElementById('canvas')! as HTMLCanvasElement;
    const result = document.getElementById('result')! as HTMLCanvasElement;
    const video = document.getElementById('video')! as HTMLVideoElement;

    const canvasCtx = canvas.getContext('2d', { willReadFrequently: true })!;
    const resultCtx = result.getContext('2d', { willReadFrequently: true })!;

    // TODO: handle Idle user

    this.subscriptions.add(
      fromEvent(document, 'visibilitychange').subscribe(() => {
        if (document.visibilityState === 'visible') {
          console.log('Resume capturing frames or take other actions');

          try {
            video.play();
          } catch (error) {
            console.error(error);
          }
        } else {
          console.log('Pause capturing frames or take other actions');
          video.pause();
        }
      })
    );

    this.subscriptions.add(
      fromEvent(video, 'loadedmetadata').subscribe(() => {
        video.play();
      })
    );

    this.subscriptions.add(
      fromEvent(video, 'play').subscribe(() => {
        console.log('The video is playing.');

        this.highlightInterval = setInterval(processVideo, 150);
      })
    );

    this.subscriptions.add(
      fromEvent(video, 'pause').subscribe(() => {
        console.log('The video has been paused.');
        clearInterval(this.highlightInterval);
      })
    );

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'environment',
        },
        audio: false,
      })
      .then((stream) => {
        video.srcObject = stream;
      })
      .catch((error) => console.log('Failed to open camera: ' + error));

    const processVideo = () => {
      console.log('highlight interval is playing...');

      canvasCtx.drawImage(video, 0, 0);

      const resultCanvas = scanner.highlightPaper(canvas, {
        color: 'yellow',
        thickness: 1.5,
      });

      resultCtx.drawImage(resultCanvas, 0, 0);
    };
  }

  ngOnDestroy(): void {
    if (this.highlightInterval) clearInterval(this.highlightInterval);

    this.subscriptions.unsubscribe();
  }
}
