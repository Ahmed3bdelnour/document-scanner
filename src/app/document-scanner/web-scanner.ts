// @ts-nocheck

export enum ScanResult {
  NoDocument = 0,
  NotReadyDocument = 1,
  ReadyDocument = 2,
}

interface IPoint {
  x: number;
  y: number;
}

interface IContourPoints {
  topLeft: IPoint;
  topRight: IPoint;
  bottomLeft: IPoint;
  bottomRight: IPoint;
}

export class WebScanner {
  cv = null;

  constructor(_cv) {
    this.cv = _cv;
  }

  renderOriginalVideo(
    capture: typeof this.cv.VideoCapture,
    width: number,
    height: number
  ) {
    const img = new this.cv.Mat(height, width, this.cv.CV_8UC4);
    capture.read(img);
    this.cv.imshow('result', img);
    this.deleteCVObject(img);
  }

  highlightDocument(
    capture: typeof this.cv.VideoCapture,
    width: number,
    height: number
  ) {
    const img = new this.cv.Mat(height, width, this.cv.CV_8UC4);
    const maxContour = new this.cv.Mat();

    capture.read(img);

    const contourExists = this.findDocumentContour(img, maxContour);

    let scanResult = ScanResult.NoDocument;

    if (contourExists) {
      const points = this.getContourCornerPoints(maxContour);
      this.drawContourInImage(img, points);

      const hasFourPoints =
        points.topLeft &&
        points.topRight &&
        points.bottomLeft &&
        points.bottomRight;

      const smallContour =
        hasFourPoints && this.cv.boundingRect(maxContour).width < 0.8 * width;

      if (smallContour) scanResult = ScanResult.NotReadyDocument;

      const readyContour =
        hasFourPoints && this.cv.boundingRect(maxContour).width >= 0.8 * width;
      if (readyContour) scanResult = ScanResult.ReadyDocument;
    }

    this.cv.imshow('result', img);

    this.deleteCVObject(maxContour);
    this.deleteCVObject(img);

    return scanResult;
  }

  extractDocument(
    capture: typeof this.cv.VideoCapture,
    width: number,
    height: number,
    extractFullImage: boolean
  ) {
    const src = new this.cv.Mat(height, width, this.cv.CV_8UC4);
    capture.read(src);

    const imageWidth = src.cols;
    const imageHeight = src.rows;

    let resultWidth;
    let resultHeight;

    let topLeftCorner: IPoint;
    let topRightCorner: IPoint;
    let bottomLeftCorner: IPoint;
    let bottomRightCorner: IPoint;

    if (extractFullImage) {
      topLeftCorner = { x: 0, y: 0 };
      topRightCorner = { x: imageWidth, y: 0 };
      bottomLeftCorner = { x: 0, y: imageHeight };
      bottomRightCorner = { x: imageWidth, y: imageHeight };
      resultWidth = imageWidth;
      resultHeight = imageHeight;
    } else {
      const contour = new this.cv.Mat();
      const contourExists = this.findDocumentContour(src, contour);

      if (!contourExists) {
        topLeftCorner = { x: 0, y: 0 };
        topRightCorner = { x: imageWidth, y: 0 };
        bottomLeftCorner = { x: 0, y: imageHeight };
        bottomRightCorner = { x: imageWidth, y: imageHeight };
        resultWidth = imageWidth;
        resultHeight = imageHeight;
      } else {
        const contourPoints = this.getContourCornerPoints(contour);

        if (
          !contourPoints.topLeft ||
          !contourPoints.topRight ||
          !contourPoints.bottomLeft ||
          !contourPoints.bottomRight
        ) {
          topLeftCorner = { x: 0, y: 0 };
          topRightCorner = { x: imageWidth, y: 0 };
          bottomLeftCorner = { x: 0, y: imageHeight };
          bottomRightCorner = { x: imageWidth, y: imageHeight };
          resultWidth = imageWidth;
          resultHeight = imageHeight;
        } else {
          topLeftCorner = contourPoints.topLeft;
          topRightCorner = contourPoints.topRight;
          bottomLeftCorner = contourPoints.bottomLeft;
          bottomRightCorner = contourPoints.bottomRight;
          const rect = this.cv.boundingRect(contour);
          resultWidth = rect.width;
          resultHeight = rect.height;
        }
      }

      this.deleteCVObject(contour);
    }

    const dsize = new this.cv.Size(resultWidth, resultHeight);
    const srcTri = this.cv.matFromArray(4, 1, this.cv.CV_32FC2, [
      topLeftCorner.x,
      topLeftCorner.y,
      topRightCorner.x,
      topRightCorner.y,
      bottomLeftCorner.x,
      bottomLeftCorner.y,
      bottomRightCorner.x,
      bottomRightCorner.y,
    ]);

    const dstTri = this.cv.matFromArray(4, 1, this.cv.CV_32FC2, [
      0,
      0,
      resultWidth,
      0,
      0,
      resultHeight,
      resultWidth,
      resultHeight,
    ]);

    const M = this.cv.getPerspectiveTransform(srcTri, dstTri);

    const dst = new this.cv.Mat(height, width, this.cv.CV_8UC4);
    this.cv.warpPerspective(
      src,
      dst,
      M,
      dsize,
      this.cv.INTER_LINEAR,
      this.cv.BORDER_CONSTANT,
      new this.cv.Scalar()
    );

    const canvas = document.createElement('canvas');
    this.cv.imshow(canvas, dst);

    this.deleteCVObject(src);
    this.deleteCVObject(dst);
    this.deleteCVObject(srcTri);
    this.deleteCVObject(dstTri);
    this.deleteCVObject(M);

    return canvas;
  }

  findDocumentContour(img: typeof this.cv.Mat, contour: typeof this.cv.Mat) {
    let contourExists = false;
    const imgGray = new this.cv.Mat();
    const imgBlur = new this.cv.Mat();
    const imgThresh = new this.cv.Mat();
    const contours = new this.cv.MatVector();
    const hierarchy = new this.cv.Mat();

    this.cv.cvtColor(img, imgGray, this.cv.COLOR_RGBA2GRAY);
    this.cv.GaussianBlur(
      imgGray,
      imgBlur,
      new this.cv.Size(5, 5),
      0,
      0,
      this.cv.BORDER_DEFAULT
    );
    this.cv.threshold(
      imgBlur,
      imgThresh,
      0,
      255,
      this.cv.THRESH_BINARY + this.cv.THRESH_OTSU
    );
    this.cv.findContours(
      imgThresh,
      contours,
      hierarchy,
      this.cv.RETR_CCOMP,
      this.cv.CHAIN_APPROX_SIMPLE
    );

    let maxArea = 0.2 * img.rows * img.cols;
    let maxContourIndex = -1;

    for (let i = 0; i < contours.size(); ++i) {
      const c = contours.get(i);
      const contourArea = this.cv.contourArea(c);
      if (contourArea > maxArea) {
        maxArea = contourArea;
        maxContourIndex = i;
      }
      this.deleteCVObject(c);
    }

    if (maxContourIndex !== -1) {
      contourExists = true;
      const c = contours.get(maxContourIndex);
      c.copyTo(contour);
      this.deleteCVObject(c);
    }

    this.deleteCVObject(imgGray);
    this.deleteCVObject(imgBlur);
    this.deleteCVObject(imgThresh);
    this.deleteCVObject(contours);
    this.deleteCVObject(hierarchy);

    return contourExists;
  }

  drawContourInImage(img: typeof this.cv.Mat, points: IContourPoints) {
    const { topLeft, topRight, bottomLeft, bottomRight } = points;

    if (!topLeft || !topRight || !bottomLeft || !bottomRight) return;

    const color = new this.cv.Scalar(255, 255, 0, 255);

    const line1 = this.cv.line(
      img,
      new this.cv.Point(topLeft.x, topLeft.y),
      new this.cv.Point(topRight.x, topRight.y),
      color,
      2
    );

    const line2 = this.cv.line(
      img,
      new this.cv.Point(topRight.x, topRight.y),
      new this.cv.Point(bottomRight.x, bottomRight.y),
      color,
      2
    );

    const line3 = this.cv.line(
      img,
      new this.cv.Point(bottomRight.x, bottomRight.y),
      new this.cv.Point(bottomLeft.x, bottomLeft.y),
      color,
      2
    );

    const line4 = this.cv.line(
      img,
      new this.cv.Point(bottomLeft.x, bottomLeft.y),
      new this.cv.Point(topLeft.x, topLeft.y),
      color,
      2
    );

    this.deleteCVObject(line1);
    this.deleteCVObject(line2);
    this.deleteCVObject(line3);
    this.deleteCVObject(line4);
  }

  getContourCornerPoints(contour: typeof this.cv.Mat): IContourPoints {
    if (!contour)
      return {
        topLeft: null,
        topRight: null,
        bottomLeft: null,
        bottomRight: null,
      };

    const rect = this.cv.minAreaRect(contour);

    const center = rect.center;
    let topLeft;
    let topLeftCornerDist = 0;
    let topRight;
    let topRightCornerDist = 0;
    let bottomLeft;
    let bottomLeftCornerDist = 0;
    let bottomRight;
    let bottomRightCornerDist = 0;

    for (let i = 0; i < contour.data32S.length; i += 2) {
      const point = { x: contour.data32S[i], y: contour.data32S[i + 1] };
      const dist = this.distance(point, center);
      if (point.x < center.x && point.y < center.y) {
        if (dist > topLeftCornerDist) {
          topLeft = point;
          topLeftCornerDist = dist;
        }
      } else if (point.x > center.x && point.y < center.y) {
        if (dist > topRightCornerDist) {
          topRight = point;
          topRightCornerDist = dist;
        }
      } else if (point.x < center.x && point.y > center.y) {
        if (dist > bottomLeftCornerDist) {
          bottomLeft = point;
          bottomLeftCornerDist = dist;
        }
      } else if (point.x > center.x && point.y > center.y) {
        if (dist > bottomRightCornerDist) {
          bottomRight = point;
          bottomRightCornerDist = dist;
        }
      }
    }

    return {
      topLeft,
      topRight,
      bottomLeft,
      bottomRight,
    };
  }

  distance(p1: IPoint, p2: IPoint) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }

  deleteCVObject(obj: any) {
    if (!obj || obj._deleted) return;
    obj.delete();
    obj._deleted = true;
  }
}
