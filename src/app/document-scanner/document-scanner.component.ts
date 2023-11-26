import { Component, OnDestroy, OnInit } from '@angular/core';
import { DocumentScannerService } from './document-scanner.service';

@Component({
  selector: 'app-document-scanner',
  templateUrl: './document-scanner.component.html',
  styleUrls: ['./document-scanner.component.scss'],
})
export class DocumentScannerComponent implements OnInit, OnDestroy {
  constructor(public documentScannerService: DocumentScannerService) {}

  ngOnInit() {}

  scanDocument() {
    try {
      this.documentScannerService.openCamera();
    } catch (error) {
      alert(error);
    }
  }

  captureImage() {
    try {
      this.documentScannerService.stopCamera();
    } catch (error) {
      alert(error);
    }
  }

  ngOnDestroy(): void {
    try {
      this.documentScannerService.stopCamera();
    } catch (error) {
      alert(error);
    }
  }
}
