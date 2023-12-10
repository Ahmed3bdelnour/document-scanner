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
  selector: 'app-jscannify-document-scanner',
  templateUrl: './jscannify-document-scanner.component.html',
  styleUrls: ['./jscannify-document-scanner.component.scss'],
})
export class JscannifyDocumentScannerComponent implements OnInit, OnDestroy {
  @Output() onCapture = new EventEmitter();
  @Output() onClose = new EventEmitter();

  // @ts-ignore
  video: HTMLVideoElement;
  stream: MediaStream | null = null;
  capture: any = null;
  frameRate = 0;
  scanner: any;

  useAutoCapturing = true;
  scanResult = ScanResult.NoDocument;
  autoCropTimeoutId: any;

  availableCameras: any[] = [];
  activeCameraIndex = 0;

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

    this.getAvailableRearCameras();
  }

  openCamera = () => {
    const activeCamera = this.availableCameras[this.activeCameraIndex];
    if (!activeCamera) return;

    navigator.mediaDevices
      .getUserMedia({
        video: {
          deviceId: activeCamera.deviceId,
        },
        audio: false,
      })
      .then((stream) => {
        this.video.srcObject = stream;
        this.stream = stream;
        const videoTrack = this.stream.getVideoTracks()[0];
        this.frameRate = videoTrack?.getSettings?.().frameRate || 30;

        fromEvent(this.video, 'canplay')
          .pipe(take(1))
          .subscribe(() => {
            this.video.play();
            this.capture = new cv.VideoCapture(this.video);
          });
      })
      .catch((error) => alert('Failed to open camera: ' + error));
  };

  getAvailableRearCameras() {
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        console.log(devices);
        return devices.filter(
          (device) => device.kind.toLowerCase() === 'videoinput'
        );
      })
      .then((cameras) => {
        console.log(cameras);
        const rearCameras = cameras.filter((camera) =>
          camera.label.toLowerCase().includes('back')
        );

        this.availableCameras = rearCameras.length ? rearCameras : cameras;
        if (!this.availableCameras.length)
          throw new Error('No available cameras');

        this.activeCameraIndex = 0;
        this.openCamera();
      })
      .catch((error: any) => {
        alert('Can not get cameras information: ' + error);
      });
  }

  switchCamera() {
    const videoTrack = this.stream?.getVideoTracks()[0];
    if (!videoTrack) return;

    this.activeCameraIndex++;
    if (this.activeCameraIndex > this.availableCameras.length - 1)
      this.activeCameraIndex = 0;

    const activeCamera = this.availableCameras[this.activeCameraIndex];
    if (!activeCamera) return;

    videoTrack
      .applyConstraints({
        deviceId: activeCamera.deviceId,
      })
      .then(() => {
        console.log('Constraints applied successfully');
      })
      .catch((error: any) => {
        alert('Error switching camera: ' + error);
      });
  }

  processVideo = () => {
    if (this.isVideoClosed || this.isVideoPaused) return;

    console.log('highlight interval is playing...');

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
        this.scanResult = this.scanner.highlightPaper(
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
          }, 1000);
        } else if (!shouldAutoCrop && this.autoCropTimeoutId !== undefined) {
          this.removeAutoCroppingListener();
        }
      }
    } catch (error) {
      console.error(error);
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
    const resultCanvas = this.scanner.extractPaper(
      this.capture,
      this.video.width,
      this.video.height,
      fullImage
    );

    this.onCapture.emit(resultCanvas.toDataURL('image/png'));
    this.stopCameraAndFireCloseEvent();
  }

  handleFileUpload(event: Event) {
    console.log((event.target as HTMLInputElement).files);
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
}
