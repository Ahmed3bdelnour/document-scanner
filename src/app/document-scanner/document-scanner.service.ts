import { Injectable } from '@angular/core';

declare const cv: any;

enum FacingMode {
  user = 'user',
  environment = 'environment',
}

@Injectable({
  providedIn: 'root',
})
export class DocumentScannerService {
  isStreaming = false;
  currentStream: MediaStream | null = null;
  noContour = false;
  smallContour = false;
  resultPaperUrl = '';

  constructor() {}

  stopCamera = () => {
    this.isStreaming = false;
    this.noContour = false;
    this.smallContour = false;

    if (!this.currentStream) return;

    const tracks = this.currentStream.getTracks();

    tracks.forEach((track) => {
      track.stop();
    });
  };

  openCamera = async () => {
    let video = document.getElementById('videoInput') as HTMLVideoElement;
    video.srcObject = null;

    video.width = screen.availWidth;
    video.height = screen.availHeight;

    const constrains = {
      video: {
        facingMode: FacingMode.environment,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30, max: 60 },
      },
      audio: false,
    };

    this.currentStream = await navigator.mediaDevices.getUserMedia(constrains);
    video.srcObject = this.currentStream;

    video.onloadedmetadata = () => {
      video.play();

      this.isStreaming = true;

      let src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
      let highlightedPaper = new cv.Mat(video.height, video.width, cv.CV_8UC4);
      let extractedPaper = new cv.Mat();
      let cap = new cv.VideoCapture(video);

      const FPS = this.getVideoFrameRate(this.currentStream as MediaStream);
      let cropTimeoutId: any;

      const processVideo = () => {
        try {
          if (!this.isStreaming) {
            // clean and stop.

            src.delete();
            highlightedPaper.delete();
            extractedPaper.delete();
            return;
          }

          let begin = Date.now();
          // start processing.
          cap.read(src);

          const { contour, contourPoints } = this.highlightPaper(
            src,
            highlightedPaper
          );
          this.noContour =
            !contour ||
            !contourPoints ||
            !contourPoints.topLeft ||
            !contourPoints.topRight ||
            !contourPoints.bottomLeft ||
            !contourPoints.bottomRight;

          this.smallContour =
            !this.noContour && cv.boundingRect(contour).width < 0.9 * src.cols;

          const shouldAutoCrop = !this.noContour && !this.smallContour;

          if (shouldAutoCrop && cropTimeoutId === undefined) {
            cropTimeoutId = setTimeout(() => {
              if (!shouldAutoCrop) {
                clearTimeout(cropTimeoutId);
                cropTimeoutId = undefined;
                return;
              }

              this.extractPaper(src, extractedPaper);

              cv.imshow('canvasOutput', extractedPaper);

              const resultCanvas = document.getElementById(
                'canvasOutput'
              )! as HTMLCanvasElement;

              this.resultPaperUrl = resultCanvas.toDataURL('image/png');

              clearTimeout(cropTimeoutId);
              cropTimeoutId = undefined;

              this.stopCamera();
            }, 3000);
          } else if (!shouldAutoCrop && cropTimeoutId !== undefined) {
            clearTimeout(cropTimeoutId);
            cropTimeoutId = undefined;
          }

          cv.imshow('canvasOutput', highlightedPaper);

          // schedule the next one.
          let delay = 1000 / FPS - (Date.now() - begin);
          setTimeout(processVideo, delay);
        } catch (err) {
          console.error(err);
        }
      };

      // schedule the first one.
      setTimeout(processVideo, 0);
    };
  };

  getVideoFrameRate(stream: MediaStream) {
    const defaultFrameRate = 30;

    try {
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) return defaultFrameRate;

      return videoTrack.getSettings().frameRate || defaultFrameRate;
    } catch (error) {
      return defaultFrameRate;
    }
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
    options = { color: new cv.Scalar(255, 255, 0, 255), thickness: 1 }
  ): {
    contour: any;
    contourPoints: {
      topLeft: any;
      topRight: any;
      bottomLeft: any;
      bottomRight: any;
    } | null;
  } {
    src.copyTo(dst);

    const maxContour = this.findPaperContour(src);
    if (!maxContour) return { contour: null, contourPoints: null };

    const {
      topLeftCorner,
      topRightCorner,
      bottomLeftCorner,
      bottomRightCorner,
    } = this.getCornerPoints(maxContour);

    if (
      !topLeftCorner ||
      !topRightCorner ||
      !bottomLeftCorner ||
      !bottomRightCorner
    )
      return {
        contour: maxContour,
        contourPoints: {
          topLeft: topLeftCorner || null,
          topRight: topRightCorner || null,
          bottomLeft: bottomLeftCorner || null,
          bottomRight: bottomRightCorner || null,
        },
      };

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

    return {
      contour: maxContour,
      contourPoints: {
        topLeft: topLeftCorner,
        topRight: topRightCorner,
        bottomLeft: bottomLeftCorner,
        bottomRight: bottomRightCorner,
      },
    };
  }

  /**
   * Extracts and undistorts the image detected within the frame.
   * @param {*} image image to process
   * @param {*} resultWidth desired result paper width
   * @param {*} resultHeight desired result paper height
   * @param {*} cornerPoints optional custom corner points, in case automatic corner points are incorrect
   * @returns `HTMLCanvasElement` containing undistorted image
   */
  extractPaper(
    src: any,
    dst: any,
    cornerPoints: {
      topLeftCorner: any;
      topRightCorner: any;
      bottomLeftCorner: any;
      bottomRightCorner: any;
    } | null = null
  ) {
    const maxContour = this.findPaperContour(src);

    const {
      topLeftCorner,
      topRightCorner,
      bottomLeftCorner,
      bottomRightCorner,
    } = cornerPoints || this.getCornerPoints(maxContour);

    const { width, height } = cv.boundingRect(maxContour);

    let dsize = new cv.Size(width, height);
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
      width,
      0,
      0,
      height,
      width,
      height,
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
  }

  /**
   * Finds the contour of the paper within the image
   * @param {*} img image to process (cv.Mat)
   * @returns the biggest contour inside the image
   */
  findPaperContour(img: any) {
    const imgGray = new cv.Mat();
    cv.cvtColor(img, imgGray, cv.COLOR_RGBA2GRAY);

    const imgBlur = new cv.Mat();
    cv.GaussianBlur(
      imgGray,
      imgBlur,
      new cv.Size(5, 5),
      0,
      0,
      cv.BORDER_DEFAULT
    );

    const imgThresh = new cv.Mat();
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

    let maxContourIndex = -1;
    for (let i = 0; i < contours.size(); ++i) {
      let contourArea = cv.contourArea(contours.get(i));

      if (contourArea > maxArea) {
        maxArea = contourArea;
        maxContourIndex = i;
      }
    }

    const maxContour =
      maxContourIndex !== -1 ? contours.get(maxContourIndex) : null;

    imgGray.delete();
    imgBlur.delete();
    imgThresh.delete();
    contours.delete();
    hierarchy.delete();

    return maxContour;
  }

  /**
   * Calculates the corner points of a contour.
   * @param {*} contour contour from {@link findPaperContour}
   * @returns object with properties `topLeftCorner`, `topRightCorner`, `bottomLeftCorner`, `bottomRightCorner`, each with `x` and `y` property
   */
  getCornerPoints(contour: any) {
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
}
