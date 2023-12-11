export enum ScanResult {
  NoDocument = 0,
  NotReadyDocument = 1,
  ReadyDocument = 2,
}

export class WebScanner {
  cv: any = null;

  constructor(_cv: any) {
    this.cv = _cv;
  }

  renderOriginalVideo(capture: any, width: any, height: any) {
    let img = new this.cv.Mat(height, width, this.cv.CV_8UC4);
    capture.read(img);
    this.cv.imshow('result', img);
    this.deleteCVObject(img);
  }

  highlightDocument(capture: any, width: any, height: any) {
    let img = new this.cv.Mat(height, width, this.cv.CV_8UC4);
    let maxContour = new this.cv.Mat();

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
        hasFourPoints && this.cv.boundingRect(maxContour).width < 0.9 * width;

      if (smallContour) scanResult = ScanResult.NotReadyDocument;

      const readyContour =
        hasFourPoints && this.cv.boundingRect(maxContour).width >= 0.9 * width;
      if (readyContour) scanResult = ScanResult.ReadyDocument;
    }

    this.cv.imshow('result', img);

    this.deleteCVObject(maxContour);
    this.deleteCVObject(img);

    return scanResult;
  }

  extractDocument(
    capture: any,
    width: any,
    height: any,
    extractFullImage: boolean
  ) {
    let src = new this.cv.Mat(height, width, this.cv.CV_8UC4);

    capture.read(src);

    let imageWidth = src.cols;
    let imageHeight = src.rows;

    let topLeftCorner: any;
    let topRightCorner: any;
    let bottomLeftCorner: any;
    let bottomRightCorner: any;

    if (extractFullImage) {
      topLeftCorner = { x: 0, y: 0 };
      topRightCorner = { x: imageWidth, y: 0 };
      bottomLeftCorner = { x: 0, y: imageHeight };
      bottomRightCorner = { x: imageWidth, y: imageHeight };
    } else {
      let contour = new this.cv.Mat();
      const contourExists = this.findDocumentContour(src, contour);

      if (!contourExists) {
        topLeftCorner = { x: 0, y: 0 };
        topRightCorner = { x: imageWidth, y: 0 };
        bottomLeftCorner = { x: 0, y: imageHeight };
        bottomRightCorner = { x: imageWidth, y: imageHeight };
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
        } else {
          topLeftCorner = contourPoints.topLeft;
          topRightCorner = contourPoints.topRight;
          bottomLeftCorner = contourPoints.bottomLeft;
          bottomRightCorner = contourPoints.bottomRight;
        }
      }

      this.deleteCVObject(contour);
    }

    let dsize = new this.cv.Size(imageWidth, imageHeight);
    let srcTri = this.cv.matFromArray(4, 1, this.cv.CV_32FC2, [
      topLeftCorner.x,
      topLeftCorner.y,
      topRightCorner.x,
      topRightCorner.y,
      bottomLeftCorner.x,
      bottomLeftCorner.y,
      bottomRightCorner.x,
      bottomRightCorner.y,
    ]);

    let dstTri = this.cv.matFromArray(4, 1, this.cv.CV_32FC2, [
      0,
      0,
      imageWidth,
      0,
      0,
      imageHeight,
      imageWidth,
      imageHeight,
    ]);

    let M = this.cv.getPerspectiveTransform(srcTri, dstTri);

    let dst = new this.cv.Mat(height, width, this.cv.CV_8UC4);
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

  findDocumentContour(img: any, contour: any) {
    let contourExists = false;
    let imgGray = new this.cv.Mat();
    let imgBlur = new this.cv.Mat();
    let imgThresh = new this.cv.Mat();
    let contours = new this.cv.MatVector();
    let hierarchy = new this.cv.Mat();

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

    let maxArea = 0.25 * img.rows * img.cols;
    let maxContourIndex = -1;

    for (let i = 0; i < contours.size(); ++i) {
      const c = contours.get(i);
      let contourArea = this.cv.contourArea(c);
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

  drawContourInImage(img: any, points: any) {
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

  getContourCornerPoints(contour: any): {
    topLeft: any;
    topRight: any;
    bottomLeft: any;
    bottomRight: any;
  } {
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

  distance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }

  deleteCVObject(obj: any) {
    if (!obj || obj._deleted) return;
    obj.delete();
    obj._deleted = true;
  }
}
