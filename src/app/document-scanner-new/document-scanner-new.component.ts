import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { Subscription, fromEvent, take } from 'rxjs';
import { ScanResult, WebScanner } from './model';
import { loadOpenCV } from './opencv-loader';

declare let cv: any;

@Component({
  selector: 'app-document-scanner-new',
  templateUrl: './document-scanner-new.component.html',
  styleUrls: ['./document-scanner-new.component.scss'],
})
export class DocumentScannerNewComponent implements OnInit, OnDestroy {
  @Output() onCapture = new EventEmitter();
  @Output() onClose = new EventEmitter();

  // @ts-ignore
  video: HTMLVideoElement;
  stream: MediaStream | null = null;
  capture: any = null;
  scanner: any;

  useAutoCapturing = true;
  scanResult = ScanResult.NoDocument;
  autoCropTimeoutId: any;

  closed = false;

  enableSorting = false;

  subscriptions = new Subscription();

  get isVideoClosed() {
    return !this.video?.srcObject;
  }

  get isVideoStreaming() {
    return !this.isVideoClosed && !this.video.paused;
  }

  get isVideoPaused() {
    return !this.isVideoClosed && this.video.paused;
  }

  get windowInnerHeight() {
    return window.innerHeight;
  }

  ngOnInit() {}

  ngAfterViewInit(): void {
    const baseURL = window.location.origin.includes('localhost')
      ? window.location.origin
      : window.location.origin + '/document-scanner/';

    loadOpenCV(
      {
        asm: baseURL + '/assets/js/opencv/opencv.js',
      },
      () => {
        this.InitScanner();
      },
      () => {
        alert('Error happened, please try again');
      }
    ).catch((error) => alert(error));
  }

  async InitScanner() {
    cv = await cv;
    this.scanner = new WebScanner(cv);

    this.video = document.getElementById('video')! as HTMLVideoElement;
    this.video.width = window.innerWidth;
    this.video.height = 0.67 * window.innerHeight;

    this.subscriptions.add(
      fromEvent(document, 'visibilitychange').subscribe(() => {
        if (document.visibilityState === 'visible') {
          try {
            this.video.play();
          } catch (error) {
            console.error(error);
          }
        } else {
          this.video.pause();
        }
      })
    );

    this.subscriptions.add(
      fromEvent(this.video, 'play').subscribe(() => {
        setTimeout(this.processVideo, 0);
      })
    );

    this.openCamera();
  }

  openCamera = () => {
    return navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: this.video.height },
          height: { ideal: this.video.width },
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
      .catch((error) => {
        alert('Failed to open camera: ' + error);
      });
  };

  restartCamera() {
    this.stopCamera();
    this.openCamera();
  }

  processVideo = () => {
    if (this.isVideoClosed || this.isVideoPaused) return;

    try {
      if (!this.useAutoCapturing) {
        this.scanner.renderOriginalVideo(
          this.capture,
          this.video.width,
          this.video.height
        );
      }

      if (this.useAutoCapturing) {
        this.scanResult = this.scanner.highlightDocument(
          this.capture,
          this.video.width,
          this.video.height
        );

        // const shouldAutoCrop = this.scanResult === ScanResult.ReadyDocument;

        // if (shouldAutoCrop && this.autoCropTimeoutId === undefined) {
        //   this.autoCropTimeoutId = setTimeout(() => {
        //     if (!shouldAutoCrop) {
        //       this.removeAutoCroppingListener();
        //       return;
        //     }

        //     this.captureDocument(false);
        //   }, 1000);
        // } else if (!shouldAutoCrop && this.autoCropTimeoutId !== undefined) {
        //   this.removeAutoCroppingListener();
        // }
      }
    } catch (error) {
      console.error(error);
      return;
    }

    setTimeout(this.processVideo, 100);
  };

  stopCameraAndFireCloseEvent = () => {
    this.onClose.emit();
    this.stopCamera();
  };

  stopCamera() {
    this.removeAutoCroppingListener();
    this.resetVideo();
  }

  resetVideo() {
    if (!this.video) return;

    const stream = this.video.srcObject as MediaStream;
    this.video.pause();
    this.video.srcObject = null;

    if (!stream) return;
    stream.getVideoTracks()[0].stop();
  }

  toggleCapturingMode() {
    this.useAutoCapturing = !this.useAutoCapturing;
    this.scanResult = ScanResult.NoDocument;
    this.removeAutoCroppingListener();
  }

  captureDocument(fullImage: boolean) {
    const resultCanvas = this.scanner.extractDocument(
      this.capture,
      this.video.width,
      this.video.height,
      fullImage
    );

    this.onCapture.emit(resultCanvas.toDataURL('image/png'));
    this.stopCameraAndFireCloseEvent();
  }

  removeAutoCroppingListener() {
    if (!this.autoCropTimeoutId) return;

    clearTimeout(this.autoCropTimeoutId);
    this.autoCropTimeoutId = undefined;
  }

  ngOnDestroy(): void {
    this.stopCameraAndFireCloseEvent();
    this.subscriptions.unsubscribe();
    if (this.capture) this.capture = null;
  }

  //////////////

  timePeriods = [
    'Bronze age',
    'Iron age',
    'Middle ages',
    'Early modern period',
    'Long nineteenth century',
    'Bronze age',
    'Iron age',
    'Middle ages',
    'Early modern period',
    'Long nineteenth century',
    'Bronze age',
    'Iron age',
    'Middle ages',
    'Early modern period',
    'Long nineteenth century',
  ];

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.timePeriods, event.previousIndex, event.currentIndex);
  }

  deleteCapture(index: number) {
    this.timePeriods = this.timePeriods.filter((_, i) => i !== index);
  }
}
