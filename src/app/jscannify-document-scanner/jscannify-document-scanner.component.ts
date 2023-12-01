import { Component, OnDestroy, OnInit } from '@angular/core';
@Component({
  selector: 'app-jscannify-document-scanner',
  templateUrl: './jscannify-document-scanner.component.html',
  styleUrls: ['./jscannify-document-scanner.component.scss'],
})
export class JscannifyDocumentScannerComponent implements OnInit, OnDestroy {
  highlightInterval: any = undefined;

  constructor() {}

  ngOnInit() {}

  ngAfterViewInit(): void {
    // const scanner = new jscanify();

    const canvas = document.getElementById('canvas')! as HTMLCanvasElement;
    const result = document.getElementById('result')! as HTMLCanvasElement;
    const video = document.getElementById('video')! as HTMLVideoElement;

    const canvasCtx = canvas.getContext('2d')!;
    const resultCtx = result.getContext('2d')!;

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'environment',
        },
        audio: false,
      })
      .then((stream) => {
        video.srcObject = stream;

        video.onloadedmetadata = () => {
          video.play();

          this.highlightInterval = setInterval(() => {
            canvasCtx.drawImage(video, 0, 0);

            // const resultCanvas = scanner.highlightPaper(canvas, {
            //   color: 'yellow',
            //   thickness: 1.5,
            // });
            // resultCtx.drawImage(resultCanvas, 0, 0);

            resultCtx.drawImage(canvas, 0, 0);
          }, 10);
        };
      })
      .catch((error) => alert('Failed to open camera: ' + error));
  }

  ngOnDestroy(): void {
    if (this.highlightInterval) clearInterval(this.highlightInterval);
  }
}
