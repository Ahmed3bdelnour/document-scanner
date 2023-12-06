// @ts-nocheck
export class WebScanner {
  cv: any = null;

  constructor(_cv: any) {
    this.cv = _cv;
  }

  /**
   * Finds the contour of the paper within the image
   * @param {*} img image to process (this.cv.Mat)
   * @returns the biggest contour inside the image
   */
  findPaperContour(img) {
    let imgGray;
    let imgBlur;
    let imgThresh;
    let contours;
    let hierarchy;

    try {
      console.log('findPaperContour execution: start - src image matrix ', img);

      imgGray = new this.cv.Mat();
      this.cv.cvtColor(img, imgGray, this.cv.COLOR_RGBA2GRAY);

      console.log('findPaperContour execution: imgGray ', imgGray);

      imgBlur = new this.cv.Mat();
      this.cv.GaussianBlur(
        imgGray,
        imgBlur,
        new this.cv.Size(5, 5),
        0,
        0,
        this.cv.BORDER_DEFAULT
      );

      console.log('findPaperContour execution: imgBlur ', imgBlur);

      imgThresh = new this.cv.Mat();
      this.cv.threshold(
        imgBlur,
        imgThresh,
        0,
        255,
        this.cv.THRESH_BINARY + this.cv.THRESH_OTSU
      );

      console.log('findPaperContour execution: imgThresh ', imgThresh);

      contours = new this.cv.MatVector();
      hierarchy = new this.cv.Mat();
      this.cv.findContours(
        imgThresh,
        contours,
        hierarchy,
        this.cv.RETR_CCOMP,
        this.cv.CHAIN_APPROX_SIMPLE
      );

      console.log('findPaperContour execution: contours ', contours);

      let maxArea = 0;
      let maxContourIndex = -1;

      for (let i = 0; i < contours.size(); ++i) {
        let contourArea = this.cv.contourArea(contours.get(i));
        if (contourArea > maxArea) {
          maxArea = contourArea;
          maxContourIndex = i;
        }
      }

      console.log(
        'findPaperContour execution: maxArea, maxContourIndex ',
        maxArea,
        maxContourIndex
      );

      const maxContour =
        maxContourIndex !== -1 ? contours.get(maxContourIndex) : null;

      console.log('findPaperContour execution: maxContour ', maxContour);

      this.deleteCVObject(imgGray);
      this.deleteCVObject(imgBlur);
      this.deleteCVObject(imgThresh);
      this.deleteCVObject(contours);
      this.deleteCVObject(hierarchy);

      console.log(
        'findPaperContour execution: cleaning matrixes',
        imgGray,
        imgBlur,
        imgThresh,
        contours,
        hierarchy
      );

      return maxContour;
    } catch (error) {
      this.deleteCVObject(imgGray);
      this.deleteCVObject(imgBlur);
      this.deleteCVObject(imgThresh);
      this.deleteCVObject(contours);
      this.deleteCVObject(hierarchy);

      throw new Error(error);
    }
  }

  /**
   * Highlights the paper detected inside the image.
   * @param {*} image image to process
   * @param {*} options options for highlighting. Accepts `color` and `thickness` parameter
   * @returns `HTMLCanvasElement` with original image and paper highlighted
   */
  highlightPaper(capture, width, height) {
    let img;
    let maxContour;

    try {
      console.log('highlightPaper execution: start');

      img = new this.cv.Mat(height, width, this.cv.CV_8UC4);
      capture.read(img);

      console.log('highlightPaper execution: src img martrix ', img);

      maxContour = this.findPaperContour(img);

      console.log('highlightPaper execution:  maxContour ', maxContour);

      if (maxContour) {
        this.drawContourInImage(img, maxContour);
        this.deleteCVObject(maxContour);
      }

      this.cv.imshow('result', img);

      this.deleteCVObject(img);

      console.log(
        'highlightPaper execution: cleaning img and maxContour ',
        img,
        maxContour
      );
    } catch (error) {
      this.deleteCVObject(img);
      this.deleteCVObject(maxContour);

      console.log(
        'highlightPaper execution: cleaning img and maxContour ',
        img,
        maxContour
      );

      throw new Error(error);
    }
  }

  extractPaper(image, resultWidth, resultHeight, fullPaper = false) {
    const canvas = document.createElement('canvas');

    let img = this.cv.imread(image);

    if (!fullPaper) {
      let maxContour = this.findPaperContour(img);

      if (maxContour) {
        let warpedDst = new this.cv.Mat();

        let dsize = new this.cv.Size(resultWidth, resultHeight);
        let srcTri = this.getApproximatePolyDBContour(maxContour);

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
        this.deleteCVObject(maxContour);
        this.deleteCVObject(srcTri);
        this.deleteCVObject(dstTri);
        this.deleteCVObject(m);
      } else {
        this.cv.imshow(canvas, img);
      }
    } else {
      this.cv.imshow(canvas, img);
    }

    this.deleteCVObject(img);

    return canvas;
  }

  drawContourInImage(img, contour) {
    let contoursToDraw;
    let approxCurve;

    try {
      approxCurve = this.getApproximatePolyDBContour(contour);
      contoursToDraw = new this.cv.MatVector();
      contoursToDraw.push_back(approxCurve);
      this.cv.drawContours(
        img,
        contoursToDraw,
        0,
        new cv.Scalar(255, 255, 0, 255),
        2
      );

      this.deleteCVObject(contoursToDraw);
      this.deleteCVObject(approxCurve);
    } catch (error) {
      this.deleteCVObject(contoursToDraw);
      this.deleteCVObject(approxCurve);

      throw new Error(error);
    }
  }

  getApproximatePolyDBContour(contour) {
    let approxCurve;

    try {
      const epsilon = 0.04 * this.cv.arcLength(contour, true); // You can adjust the epsilon value

      approxCurve = new this.cv.Mat();
      this.cv.approxPolyDP(contour, approxCurve, epsilon, true);

      return approxCurve;
    } catch (error) {
      this.deleteCVObject(approxCurve);

      throw new Error(error);
    }
  }

  deleteCVObject(matrix) {
    try {
      if (matrix.empty()) return;
      matrix.delete();
    } catch (error) {
      console.log('Matrix already deleted before: ', error.message);
    }
  }
}
