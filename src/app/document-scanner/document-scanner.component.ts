import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import {
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewEncapsulation,
} from '@angular/core';
import { jsPDF } from 'jspdf';
import { ToastrService } from 'ngx-toastr';
import { Subscription, fromEvent } from 'rxjs';
import { take } from 'rxjs/operators';
import { loadOpenCV } from './opencv-loader';
import { ScanResult, WebScanner } from './web-scanner';

declare let cv: any;

@Component({
  selector: 'app-document-scanner',
  templateUrl: './document-scanner.component.html',
  styleUrls: ['./document-scanner.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class DocumentScannerComponent implements OnInit, OnDestroy {
  @Output() onCapture = new EventEmitter();
  @Output() onClose = new EventEmitter();

  video: HTMLVideoElement;
  stream: MediaStream | null = null;
  capture: typeof cv.VideoCapture = null;
  scanner: WebScanner;
  frameRate = 30;

  useAutoCapturing = false;
  scanResult = ScanResult.NoDocument;
  autoCropTimeoutId: any;

  availableCameras: MediaDeviceInfo[] = [];
  activeCameraIndex = 0;
  loadingCameraError = false;

  capturedImages: string[] = [];

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

  constructor(private toastr: ToastrService) {}

  ngOnInit() {}

  ngAfterViewInit(): void {
    loadOpenCV(
      {
        asm:
          window.location.origin +
          '/document-scanner/assets/js/opencv/opencv.js',
      },
      () => {
        this.InitScanner();
      },
      () => {
        this.toastr.error(
          'An unexpected error has happened. Please try again.'
        );
      }
    ).catch((error) => this.toastr.error(error));
  }

  async InitScanner() {
    cv = await cv;
    this.scanner = new WebScanner(cv);

    this.video = document.getElementById('video')! as HTMLVideoElement;
    this.video.width = 1080;
    this.video.height = 0.7 * 1920;

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

    await this.getAvailableCameras();
    this.openCamera();
  }

  getAvailableCameras() {
    return navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'environment',
        },
        audio: false,
      })
      .then(() => navigator.mediaDevices.enumerateDevices())
      .then((devices) => {
        return devices.filter(
          (device) => device.kind.toLowerCase() === 'videoinput'
        );
      })
      .then((cameras) => {
        const rearCameras = cameras.filter((camera) =>
          camera.label.toLowerCase().includes('back')
        );
        this.availableCameras = rearCameras.length ? rearCameras : cameras;
        if (!this.availableCameras.length)
          throw new Error('No available cameras');

        this.activeCameraIndex = 0;

        return;
      })
      .catch((error: any) => {
        this.toastr.error(error);
      });
  }

  openCamera = () => {
    const activeCamera = this.availableCameras[this.activeCameraIndex];
    if (!activeCamera) return;

    this.loadingCameraError = false;

    return navigator.mediaDevices
      .getUserMedia({
        video: {
          deviceId: { exact: activeCamera.deviceId },
          width: { ideal: this.video.height },
          height: { ideal: this.video.width },
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
            this.loadingCameraError = false;
            this.video.play();
            this.capture = new cv.VideoCapture(this.video);
          });
      })
      .catch((error) => {
        this.loadingCameraError = true;
        this.toastr.error(error);
      });
  };

  switchCamera() {
    this.activeCameraIndex++;
    if (this.activeCameraIndex > this.availableCameras.length - 1)
      this.activeCameraIndex = 0;

    this.restartCamera();
  }

  restartCamera() {
    this.stopCamera();
    this.openCamera();
  }

  processVideo = () => {
    if (this.isVideoClosed || this.isVideoPaused) return;

    const startProcessingTime = Date.now();

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

        const shouldAutoCrop = this.scanResult === ScanResult.ReadyDocument;

        if (shouldAutoCrop && this.autoCropTimeoutId === undefined) {
          this.autoCropTimeoutId = setTimeout(() => {
            if (!shouldAutoCrop) {
              this.removeAutoCroppingListener();
              return;
            }

            this.captureDocument(false);
            this.toggleCapturingMode();
          }, 1000);
        } else if (!shouldAutoCrop && this.autoCropTimeoutId !== undefined) {
          this.removeAutoCroppingListener();
        }
      }
    } catch (error: any) {
      this.toastr.error(error);
      return;
    }

    setTimeout(
      this.processVideo,
      1000 / this.frameRate - (Date.now() - startProcessingTime)
    );
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
    this.capturedImages.push(resultCanvas.toDataURL('image/png'));
  }

  removeAutoCroppingListener() {
    if (!this.autoCropTimeoutId) return;

    clearTimeout(this.autoCropTimeoutId);
    this.autoCropTimeoutId = undefined;
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(
      this.capturedImages,
      event.previousIndex,
      event.currentIndex
    );
  }

  deleteImage(index: number) {
    this.capturedImages = this.capturedImages.filter((_, i) => i !== index);
  }

  generateDocumentAndClose() {
    this.onCapture.emit(this.createPDF(this.capturedImages));
    this.stopCameraAndFireCloseEvent();
  }

  createPDF(imagesURLS: string[]) {
    const doc = new jsPDF('p', 'pt', 'letter', true);
    const width = doc.internal.pageSize.width;
    const height = doc.internal.pageSize.height;

    imagesURLS.forEach((image, index) => {
      doc.addImage(image, 'PNG', 0, 0, width, height, '', 'FAST');
      if (index !== imagesURLS.length - 1) doc.addPage();
    });

    const pdfBlob = doc.output('blob');
    return new File(
      [pdfBlob],
      `document-${new Date().toString().replace(/:/g, '_')}.pdf`,
      {
        type: 'application/pdf',
      }
    );
  }

  ngOnDestroy(): void {
    this.stopCameraAndFireCloseEvent();
    this.subscriptions.unsubscribe();
    if (this.capture) this.capture = null;
  }
}
