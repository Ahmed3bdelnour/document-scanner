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
    try {
      capture.read(img);
      this.cv.imshow('result', img);
      this.deleteCVObject(img);
    } catch (error: any) {
      this.deleteCVObject(img);
      throw new Error(error);
    }
  }

  highlightPaper(capture: any, width: any, height: any) {
    let img = new this.cv.Mat(height, width, this.cv.CV_8UC4);
    let maxContour = new this.cv.Mat();

    try {
      capture.read(img);
      const contourExists = this.findPaperContour(img, maxContour);

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
          hasFourPoints &&
          this.cv.boundingRect(maxContour).width >= 0.9 * width;
        if (readyContour) scanResult = ScanResult.ReadyDocument;
      }

      this.deleteCVObject(maxContour);
      this.cv.imshow('result', img);
      this.deleteCVObject(img);

      return scanResult;
    } catch (error: any) {
      this.deleteCVObject(img);
      this.deleteCVObject(maxContour);
      throw new Error(error);
    }
  }

  // extractPaper(
  //   capture: any,
  //   fullWidth: any,
  //   fullHeight: any,
  //   resultWidth: any,
  //   resultHeight: any,
  //   fullPaper = false
  // ) {
  //   const canvas = document.createElement('canvas');

  //   let img = new this.cv.Mat(fullHeight, fullWidth, this.cv.CV_8UC4);
  //   capture.read(img);

  //   if (!fullPaper) {
  //     let maxContour = new this.cv.Mat();
  //     const contourExists = this.findPaperContour(img, maxContour);

  //     if (contourExists) {
  //       const points = this.getContourCornerPoints(maxContour);
  //       const hasFourPoints =
  //         points.topLeft &&
  //         points.topRight &&
  //         points.bottomLeft &&
  //         points.bottomRight;

  //       if (hasFourPoints) {
  //         let warpedDst = new this.cv.Mat();

  //         let dsize = new this.cv.Size(resultWidth, resultHeight);
  //         let srcTri = new this.cv.Mat();
  //         this.getApproximatePolyDBContour(maxContour, srcTri);

  //         let dstTri = this.cv.matFromArray(4, 1, this.cv.CV_32FC2, [
  //           0,
  //           0,
  //           resultWidth,
  //           0,
  //           0,
  //           resultHeight,
  //           resultWidth,
  //           resultHeight,
  //         ]);

  //         let M = this.cv.getPerspectiveTransform(srcTri, dstTri);
  //         this.cv.warpPerspective(
  //           img,
  //           warpedDst,
  //           M,
  //           dsize,
  //           this.cv.INTER_LINEAR,
  //           this.cv.BORDER_CONSTANT,
  //           new this.cv.Scalar()
  //         );

  //         this.cv.imshow(canvas, warpedDst);

  //         this.deleteCVObject(warpedDst);
  //         this.deleteCVObject(srcTri);
  //         this.deleteCVObject(dstTri);
  //         this.deleteCVObject(M); // delete is not needed?
  //       } else {
  //         this.cv.imshow(canvas, img);
  //       }
  //     } else {
  //       this.cv.imshow(canvas, img);
  //     }

  //     this.deleteCVObject(maxContour);
  //   } else {
  //     this.cv.imshow(canvas, img);
  //   }

  //   this.deleteCVObject(img);

  //   return canvas;
  // }

  extractPaper(
    capture: any,
    width: any,
    height: any,
    extractFullImage: boolean
  ) {
    let src = new this.cv.Mat(height, width, this.cv.CV_8UC4);
    capture.read(src);

    let dst = new this.cv.Mat(height, width, this.cv.CV_8UC4);

    let imageWidth = src.cols;
    let imageHeight = src.rows;

    let topLeftCorner: any;
    let topRightCorner: any;
    let bottomLeftCorner: any;
    let bottomRightCorner: any;
    let resultWidth = 0;
    let resultHeight = 0;

    if (extractFullImage) {
      topLeftCorner = { x: 0, y: 0 };
      topRightCorner = { x: imageWidth, y: 0 };
      bottomLeftCorner = { x: 0, y: imageHeight };
      bottomRightCorner = { x: imageWidth, y: imageHeight };
      resultWidth = imageWidth;
      resultHeight = imageHeight;
    } else {
      let contour = new this.cv.Mat();
      const contourExists = this.findPaperContour(src, contour);

      if (!contourExists) {
        topLeftCorner = { x: 0, y: 0 };
        topRightCorner = { x: imageWidth, y: 0 };
        bottomLeftCorner = { x: 0, y: imageHeight };
        bottomRightCorner = { x: imageWidth, y: imageHeight };
        resultWidth = imageWidth;
        resultHeight = imageHeight;
      }

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

        const contourRect = this.cv.boundingRect(contour);
        resultWidth = contourRect.width;
        resultHeight = contourRect.height;
      }

      contour?.delete();
      contour = null;
    }

    let dsize = new this.cv.Size(resultWidth, resultHeight);
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
      resultWidth,
      0,
      0,
      resultHeight,
      resultWidth,
      resultHeight,
    ]);

    let M = this.cv.getPerspectiveTransform(srcTri, dstTri);
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

    src.delete();
    dst.delete();

    srcTri.delete();
    srcTri = null;

    dstTri.delete();
    dstTri = null;

    return canvas;
  }

  findPaperContour(img: any, contour: any) {
    let contourExists = false;
    let imgGray = new this.cv.Mat();
    let imgBlur = new this.cv.Mat();
    let imgThresh = new this.cv.Mat();
    let contours = new this.cv.MatVector();
    let hierarchy = new this.cv.Mat();

    try {
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

      let maxArea = 0.15 * img.rows * img.cols;
      let maxContourIndex = -1;

      for (let i = 0; i < contours.size(); ++i) {
        const c = contours.get(i);
        let contourArea = this.cv.contourArea(c);
        if (contourArea > maxArea) {
          maxArea = contourArea;
          maxContourIndex = i;
        }
        c.delete();
      }

      if (maxContourIndex !== -1) {
        contourExists = true;
        const c = contours.get(maxContourIndex);
        c.copyTo(contour);
        c.delete();
      }

      this.deleteCVObject(imgGray);
      this.deleteCVObject(imgBlur);
      this.deleteCVObject(imgThresh);
      this.deleteCVObject(contours);
      this.deleteCVObject(hierarchy);
    } catch (error: any) {
      this.deleteCVObject(imgGray);
      this.deleteCVObject(imgBlur);
      this.deleteCVObject(imgThresh);
      this.deleteCVObject(contours);
      this.deleteCVObject(hierarchy);

      throw new Error(error);
    }

    return contourExists;
  }

  drawContourInImage(img: any, points: any) {
    try {
      const { topLeft, topRight, bottomLeft, bottomRight } = points;

      if (!topLeft || !topRight || !bottomLeft || !bottomRight) return;

      const color = new this.cv.Scalar(255, 255, 0, 255);

      this.cv.line(
        img,
        new this.cv.Point(topLeft.x, topLeft.y),
        new this.cv.Point(topRight.x, topRight.y),
        color,
        2
      );

      this.cv.line(
        img,
        new this.cv.Point(topRight.x, topRight.y),
        new this.cv.Point(bottomRight.x, bottomRight.y),
        color,
        2
      );

      this.cv.line(
        img,
        new this.cv.Point(bottomRight.x, bottomRight.y),
        new this.cv.Point(bottomLeft.x, bottomLeft.y),
        color,
        2
      );

      this.cv.line(
        img,
        new this.cv.Point(bottomLeft.x, bottomLeft.y),
        new this.cv.Point(topLeft.x, topLeft.y),
        color,
        2
      );
    } catch (error: any) {
      throw new Error(error);
    }
  }

  getApproximatePolyDBContour(contour: any, approximateCurve: any) {
    const epsilon = 0.04 * this.cv.arcLength(contour, true);
    this.cv.approxPolyDP(contour, approximateCurve, epsilon, true);
  }

  deleteCVObject(matrix: any) {
    if (!matrix || matrix._deleted) return;
    matrix.delete();
    matrix._deleted = true;
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

    let rect = this.cv.minAreaRect(contour);

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
        // top left
        if (dist > topLeftCornerDist) {
          topLeft = point;
          topLeftCornerDist = dist;
        }
      } else if (point.x > center.x && point.y < center.y) {
        // top right
        if (dist > topRightCornerDist) {
          topRight = point;
          topRightCornerDist = dist;
        }
      } else if (point.x < center.x && point.y > center.y) {
        // bottom left
        if (dist > bottomLeftCornerDist) {
          bottomLeft = point;
          bottomLeftCornerDist = dist;
        }
      } else if (point.x > center.x && point.y > center.y) {
        // bottom right
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
}
