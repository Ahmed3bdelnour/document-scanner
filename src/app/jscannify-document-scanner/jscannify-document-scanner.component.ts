import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription, fromEvent, take } from 'rxjs';
import { WebScanner } from './model';
import { loadOpenCV } from './opencv-loader';

declare let cv: any;

@Component({
  selector: 'app-jscannify-document-scanner',
  templateUrl: './jscannify-document-scanner.component.html',
  styleUrls: ['./jscannify-document-scanner.component.scss'],
})
export class JscannifyDocumentScannerComponent implements OnInit, OnDestroy {
  // @ts-ignore
  video: HTMLVideoElement;
  stream: MediaStream | null = null;
  capture: any = null;
  frameRate = 30;
  scanner: any;

  subscriptions = new Subscription();

  ngOnInit() {}

  ngAfterViewInit(): void {
    // show loading message...
    loadOpenCV(
      {
        asm: 'https://ahmed3bdelnour.github.io/document-scanner/assets/js/custom-opencv-build-2/opencv.js',
      },
      () => {
        this.InitScanner();
        // close loading message...
      },
      () => {
        alert('Failed to load opencv.js');
        // close loading message...
      }
    ).catch((error) => alert(error)); // close loading message...
  }

  async InitScanner() {
    cv = await cv;
    this.scanner = new WebScanner(cv);

    this.video = document.getElementById('video')! as HTMLVideoElement;
    this.video.width = screen.availWidth;
    this.video.height = screen.availHeight;

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
            this.capture = new cv.VideoCapture(this.video);
          });
      })
      .catch((error) => alert('Failed to open camera: ' + error));
  };

  processVideo = () => {
    if (!this.video || !this.video.srcObject || this.video.paused) return;

    console.log('highlight interval is playing...');

    const startProcessingTime = Date.now();

    try {
      this.scanner.highlightPaper(
        this.capture,
        this.video.width,
        this.video.height
      );
    } catch (error) {
      console.error(error);
      return;
    }

    setTimeout(
      this.processVideo,
      1000 / this.frameRate - (Date.now() - startProcessingTime)
    );
  };

  stopCamera = () => {
    if (!this.video) return;

    const stream = this.video.srcObject as MediaStream;
    this.video.pause();
    this.video.srcObject = null;

    if (!stream) return;
    stream.getVideoTracks()[0].stop();
  };

  ngOnDestroy(): void {
    this.stopCamera();
    this.subscriptions.unsubscribe();
    if (this.capture) this.capture = null;
  }
}
