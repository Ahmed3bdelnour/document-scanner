export class WebScanner {
  cv: any = null;

  constructor(_cv: any) {
    this.cv = _cv;
  }

  highlightPaper(capture: any, width: any, height: any) {
    let img = new this.cv.Mat(height, width, this.cv.CV_8UC4);
    let maxContour = new this.cv.Mat();

    try {
      capture.read(img);
      const contourExists = this.findPaperContour(img, maxContour);
      if (contourExists) this.drawContourInImage(img, maxContour);
      this.deleteCVObject(maxContour);
      this.cv.imshow('result', img);
      this.deleteCVObject(img);
    } catch (error: any) {
      this.deleteCVObject(img);
      this.deleteCVObject(maxContour);
      throw new Error(error);
    }
  }

  extractPaper(
    image: any,
    resultWidth: any,
    resultHeight: any,
    fullPaper = false
  ) {
    const canvas = document.createElement('canvas');

    let img = this.cv.imread(image);

    if (!fullPaper) {
      let maxContour = new this.cv.Mat();
      const contourExists = this.findPaperContour(img, maxContour);

      if (contourExists) {
        let warpedDst = new this.cv.Mat();

        let dsize = new this.cv.Size(resultWidth, resultHeight);
        let srcTri = new this.cv.Mat();
        this.getApproximatePolyDBContour(maxContour, srcTri);

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
          img,
          warpedDst,
          M,
          dsize,
          this.cv.INTER_LINEAR,
          this.cv.BORDER_CONSTANT,
          new this.cv.Scalar()
        );

        this.cv.imshow(canvas, warpedDst);

        this.deleteCVObject(warpedDst);
        this.deleteCVObject(srcTri);
        this.deleteCVObject(dstTri);
        this.deleteCVObject(M); // delete is not needed?
      } else {
        this.cv.imshow(canvas, img);
      }

      this.deleteCVObject(maxContour);
    } else {
      this.cv.imshow(canvas, img);
    }

    this.deleteCVObject(img);

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

      let maxArea = 0;
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

  drawContourInImage(img: any, contour: any) {
    let contoursToDraw = new this.cv.MatVector();
    let approxCurve = new this.cv.Mat();

    try {
      this.getApproximatePolyDBContour(contour, approxCurve);
      contoursToDraw.push_back(approxCurve);
      this.cv.drawContours(
        img,
        contoursToDraw,
        0,
        new this.cv.Scalar(255, 255, 0, 255),
        2
      );
      this.deleteCVObject(contoursToDraw);
      this.deleteCVObject(approxCurve);
    } catch (error: any) {
      this.deleteCVObject(contoursToDraw);
      this.deleteCVObject(approxCurve);

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
}
