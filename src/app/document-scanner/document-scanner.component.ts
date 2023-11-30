import {
  AfterViewInit,
  Component,
  EventEmitter,
  OnDestroy,
  Output,
} from '@angular/core';

declare const cv: any;

enum FacingMode {
  user = 'user',
  environment = 'environment',
}

@Component({
  selector: 'app-document-scanner',
  templateUrl: './document-scanner.component.html',
  styleUrls: ['./document-scanner.component.scss'],
})
export class DocumentScannerComponent implements AfterViewInit, OnDestroy {
  @Output() onScan = new EventEmitter();
  @Output() onCancel = new EventEmitter();
  @Output() onClose = new EventEmitter();

  isStreaming = false;
  noContour = false;
  smallContour = false;
  useAutoCapturing = true;
  autoCropping = false;
  autoCropTimeoutId: any;

  constructor() {}

  ngAfterViewInit(): void {
    this.startScanning();
  }

  handleFileUpload(event: Event) {
    console.log((event.target as HTMLInputElement).files);
    this.endScanning();
  }

  switchCapturingMode() {
    this.toggleAutoCapturingMode();
  }

  toggleAutoCapturingMode() {
    this.useAutoCapturing = !this.useAutoCapturing;

    if (this.autoCropTimeoutId === undefined) return;

    clearTimeout(this.autoCropTimeoutId);
    this.autoCropTimeoutId = undefined;
  }

  getVideoElement() {
    return document.getElementById('videoInput') as HTMLVideoElement;
  }

  getCurrentVideoStream() {
    return (this.getVideoElement()?.srcObject as MediaStream) || null;
  }

  endScanning = () => {
    this.isStreaming = false;
    this.noContour = false;
    this.smallContour = false;
    this.autoCropping = false;

    const video = this.getVideoElement();
    if (!video) return;

    const currentStream = this.getCurrentVideoStream();
    if (!currentStream) return;

    const tracks = currentStream.getTracks();

    tracks.forEach((track) => {
      track.stop();
    });

    video.srcObject = null;

    this.onClose.emit();
  };

  startScanning = async () => {
    const windowWidth =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      document.body.clientWidth;
    const windowHeight =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      document.body.clientHeight;

    const video = this.getVideoElement();
    if (!video) throw new Error('No video element');

    video.setAttribute('width', windowWidth + '');
    video.setAttribute('height', windowHeight + '');
    // needed for ios
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');

    video.srcObject = null;

    const constrains = {
      video: {
        facingMode: FacingMode.environment,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
      audio: false,
    };

    try {
      video.srcObject = await navigator.mediaDevices.getUserMedia(constrains);
    } catch (error) {
      alert(
        'Can not open camera, please make sure that your camera is not in use and try again!'
      );
      return;
    }

    video.onloadedmetadata = () => {
      video.play();

      this.isStreaming = true;

      let videoCapture = new cv.VideoCapture(video);

      let processTimeout: any;

      const processVideo = () => {
        if (initialProcessTimeout) clearTimeout(initialProcessTimeout);
        if (processTimeout) clearTimeout(processTimeout);

        if (!this.isStreaming) return;

        let begin = Date.now();

        let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
        // start processing.
        videoCapture.read(src);

        if (this.useAutoCapturing) {
          let contour = this.findPaperContour(src);

          const {
            topLeftCorner,
            topRightCorner,
            bottomLeftCorner,
            bottomRightCorner,
          } = this.getCornerPoints(contour);

          this.noContour =
            !contour ||
            !topLeftCorner ||
            !topRightCorner ||
            !bottomLeftCorner ||
            !bottomRightCorner;

          let highlightedPaper = new cv.Mat(
            video.height,
            video.width,
            cv.CV_8UC4
          );

          this.highlightPaper(
            src,
            highlightedPaper,
            topLeftCorner,
            topRightCorner,
            bottomLeftCorner,
            bottomRightCorner
          );

          this.smallContour =
            !this.noContour && cv.boundingRect(contour).width < 0.9 * src.cols;

          contour?.delete();
          contour = null;

          const shouldAutoCrop = !this.noContour && !this.smallContour;

          if (shouldAutoCrop && this.autoCropTimeoutId === undefined) {
            this.autoCropping = true;
            this.autoCropTimeoutId = setTimeout(() => {
              if (!shouldAutoCrop) {
                clearTimeout(this.autoCropTimeoutId);
                this.autoCropTimeoutId = undefined;
                return;
              }

              this.getExtractedPaper();
            }, 1000);
          } else if (!shouldAutoCrop && this.autoCropTimeoutId !== undefined) {
            clearTimeout(this.autoCropTimeoutId);
            this.autoCropTimeoutId = undefined;
            this.autoCropping = false;
          }

          cv.imshow('canvasOutput', this.noContour ? src : highlightedPaper);

          highlightedPaper.delete();
          highlightedPaper = null;
        } else {
          cv.imshow('canvasOutput', src);
        }

        src.delete();
        src = null;

        // schedule the next one.
        const FPS = this.getVideoFrameRate(this.getCurrentVideoStream());
        const delay = 1000 / FPS - (Date.now() - begin);
        processTimeout = setTimeout(processVideo, delay);
      };

      // schedule the first one.
      const initialProcessTimeout = setTimeout(processVideo, 0);
      video.onloadedmetadata = null;
    };
  };

  cancelScanning() {
    this.endScanning();
    this.onCancel.emit();
  }

  getExtractedPaper(extractFullDocument = false) {
    const video = this.getVideoElement();
    if (!video) throw new Error('No video element');

    let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
    let extractedPaper = new cv.Mat(video.height, video.width, cv.CV_8UC4);

    this.extractPaper(src, extractedPaper, extractFullDocument);

    cv.imshow('canvasOutput', extractedPaper);

    const resultCanvas = document.getElementById(
      'canvasOutput'
    )! as HTMLCanvasElement;

    this.onScan.emit(resultCanvas.toDataURL('image/png'));

    clearTimeout(this.autoCropTimeoutId);
    this.autoCropTimeoutId = undefined;

    this.endScanning();

    src.delete();
    src = null;

    extractedPaper.delete();
    extractedPaper = null;
  }

  getVideoFrameRate(stream: MediaStream) {
    const defaultFrameRate = 30;

    if (!stream) return defaultFrameRate;

    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return defaultFrameRate;

    return videoTrack.getSettings().frameRate || defaultFrameRate;
  }

  /**
   * Highlights the paper detected inside the image.
   * @param {*} src image to process
   * @param {*} dst processed image to get
   * @param {*} options options for highlighting. Accepts `color [r, g, b]` and `thickness` parameter
   */
  highlightPaper(
    src: any,
    dst: any,
    topLeftCorner: any,
    topRightCorner: any,
    bottomLeftCorner: any,
    bottomRightCorner: any,
    options = { color: new cv.Scalar(255, 255, 0, 255), thickness: 1 }
  ) {
    src.copyTo(dst);

    if (
      !topLeftCorner ||
      !topRightCorner ||
      !bottomLeftCorner ||
      !bottomRightCorner
    )
      return;

    cv.line(
      dst,
      topLeftCorner,
      topRightCorner,
      options.color,
      options.thickness
    );
    cv.line(
      dst,
      topRightCorner,
      bottomRightCorner,
      options.color,
      options.thickness
    );
    cv.line(
      dst,
      bottomRightCorner,
      bottomLeftCorner,
      options.color,
      options.thickness
    );
    cv.line(
      dst,
      bottomLeftCorner,
      topLeftCorner,
      options.color,
      options.thickness
    );
  }

  /**
   * Extracts and undistorts the image detected within the frame.
   * @param {*} image image to process
   * @param {*} resultWidth desired result paper width
   * @param {*} resultHeight desired result paper height
   * @param {*} cornerPoints optional custom corner points, in case automatic corner points are incorrect
   * @returns `HTMLCanvasElement` containing undistorted image
   */
  extractPaper(src: any, dst: any, extractFullDocument = false) {
    let imageWidth = src.cols;
    let imageHeight = src.rows;

    let topLeftCorner: any;
    let topRightCorner: any;
    let bottomLeftCorner: any;
    let bottomRightCorner: any;
    let resultWidth = 0;
    let resultHeight = 0;

    if (extractFullDocument) {
      topLeftCorner = { x: 0, y: 0 };
      topRightCorner = { x: imageWidth, y: 0 };
      bottomLeftCorner = { x: 0, y: imageHeight };
      bottomRightCorner = { x: imageWidth, y: imageHeight };
      resultWidth = imageWidth;
      resultHeight = imageHeight;
    } else {
      let contour = this.findPaperContour(src);

      if (!contour) {
        topLeftCorner = { x: 0, y: 0 };
        topRightCorner = { x: imageWidth, y: 0 };
        bottomLeftCorner = { x: 0, y: imageHeight };
        bottomRightCorner = { x: imageWidth, y: imageHeight };
        resultWidth = imageWidth;
        resultHeight = imageHeight;
      }

      const contourPoints = this.getCornerPoints(contour);

      if (
        !contourPoints.topLeftCorner ||
        !contourPoints.topRightCorner ||
        !contourPoints.bottomLeftCorner ||
        !contourPoints.bottomRightCorner
      ) {
        topLeftCorner = { x: 0, y: 0 };
        topRightCorner = { x: imageWidth, y: 0 };
        bottomLeftCorner = { x: 0, y: imageHeight };
        bottomRightCorner = { x: imageWidth, y: imageHeight };
        resultWidth = imageWidth;
        resultHeight = imageHeight;
      } else {
        topLeftCorner = contourPoints.topLeftCorner;
        topRightCorner = contourPoints.topRightCorner;
        bottomLeftCorner = contourPoints.bottomLeftCorner;
        bottomRightCorner = contourPoints.bottomRightCorner;

        const contourRect = cv.boundingRect(contour);
        resultWidth = contourRect.width;
        resultHeight = contourRect.height;
      }

      contour?.delete();
      contour = null;
    }

    let dsize = new cv.Size(resultWidth, resultHeight);
    let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      topLeftCorner.x,
      topLeftCorner.y,
      topRightCorner.x,
      topRightCorner.y,
      bottomLeftCorner.x,
      bottomLeftCorner.y,
      bottomRightCorner.x,
      bottomRightCorner.y,
    ]);

    let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
      0,
      0,
      resultWidth,
      0,
      0,
      resultHeight,
      resultWidth,
      resultHeight,
    ]);

    let M = cv.getPerspectiveTransform(srcTri, dstTri);
    cv.warpPerspective(
      src,
      dst,
      M,
      dsize,
      cv.INTER_LINEAR,
      cv.BORDER_CONSTANT,
      new cv.Scalar()
    );

    srcTri.delete();
    srcTri = null;

    dstTri.delete();
    dstTri = null;
  }

  /**
   * Finds the contour of the paper within the image
   * @param {*} img image to process (cv.Mat)
   * @returns the biggest contour inside the image
   */
  findPaperContour(img: any) {
    let imgGray = new cv.Mat();
    cv.cvtColor(img, imgGray, cv.COLOR_RGBA2GRAY);

    let imgBlur = new cv.Mat();
    cv.GaussianBlur(
      imgGray,
      imgBlur,
      new cv.Size(5, 5),
      0,
      0,
      cv.BORDER_DEFAULT
    );

    let imgThresh = new cv.Mat();
    cv.threshold(imgBlur, imgThresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    cv.findContours(
      imgThresh,
      contours,
      hierarchy,
      cv.RETR_CCOMP,
      cv.CHAIN_APPROX_SIMPLE
    );

    let maxArea = 0.15 * img.rows * img.cols;
    let maxContour = null;

    for (let i = 0; i < contours.size(); ++i) {
      let contour = contours.get(i);
      let contourArea = cv.contourArea(contour);

      if (contourArea > maxArea) {
        let epsilon = 0.05 * cv.arcLength(contour, true);
        let approxCurve = new cv.Mat();
        cv.approxPolyDP(contour, approxCurve, epsilon, true);

        if (approxCurve.rows === 4) {
          maxArea = contourArea;
          maxContour = approxCurve;
        } else {
          approxCurve.delete();
          approxCurve = null;
        }
      }
    }

    imgGray.delete();
    imgGray = null;

    imgBlur.delete();
    imgBlur = null;

    imgThresh.delete();
    imgThresh = null;

    contours.delete();
    contours = null;

    hierarchy.delete();
    hierarchy = null;

    return maxContour;
  }

  /**
   * Calculates the corner points of a contour.
   * @param {*} contour contour from {@link findPaperContour}
   * @returns object with properties `topLeftCorner`, `topRightCorner`, `bottomLeftCorner`, `bottomRightCorner`, each with `x` and `y` property
   */
  getCornerPoints(contour: any) {
    if (!contour)
      return {
        topLeftCorner: null,
        topRightCorner: null,
        bottomLeftCorner: null,
        bottomRightCorner: null,
      };

    let rect = cv.minAreaRect(contour);
    const center = rect.center;
    let topLeftCorner;
    let topLeftCornerDist = 0;
    let topRightCorner;
    let topRightCornerDist = 0;
    let bottomLeftCorner;
    let bottomLeftCornerDist = 0;
    let bottomRightCorner;
    let bottomRightCornerDist = 0;

    for (let i = 0; i < contour.data32S.length; i += 2) {
      const point = { x: contour.data32S[i], y: contour.data32S[i + 1] };
      const dist = this.distance(point, center);
      if (point.x < center.x && point.y < center.y) {
        // top left
        if (dist > topLeftCornerDist) {
          topLeftCorner = point;
          topLeftCornerDist = dist;
        }
      } else if (point.x > center.x && point.y < center.y) {
        // top right
        if (dist > topRightCornerDist) {
          topRightCorner = point;
          topRightCornerDist = dist;
        }
      } else if (point.x < center.x && point.y > center.y) {
        // bottom left
        if (dist > bottomLeftCornerDist) {
          bottomLeftCorner = point;
          bottomLeftCornerDist = dist;
        }
      } else if (point.x > center.x && point.y > center.y) {
        // bottom right
        if (dist > bottomRightCornerDist) {
          bottomRightCorner = point;
          bottomRightCornerDist = dist;
        }
      }
    }
    return {
      topLeftCorner,
      topRightCorner,
      bottomLeftCorner,
      bottomRightCorner,
    };
  }

  distance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }

  cropDocumentManually() {
    this.getExtractedPaper(
      !this.useAutoCapturing || (this.useAutoCapturing && !this.autoCropping)
    );
  }

  ngOnDestroy(): void {
    this.endScanning();
  }
}
