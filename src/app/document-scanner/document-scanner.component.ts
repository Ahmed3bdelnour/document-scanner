import { Component, OnInit } from '@angular/core';
import { DocumentScannerService } from './document-scanner.service';

@Component({
  selector: 'app-document-scanner',
  templateUrl: './document-scanner.component.html',
  styleUrls: ['./document-scanner.component.scss'],
})
export class DocumentScannerComponent implements OnInit {
  constructor(public documentScannerService: DocumentScannerService) {}

  ngOnInit() {}

  scanDocument() {
    this.documentScannerService.openCamera();
  }

  captureImage() {
    this.documentScannerService.stopCamera();
  }

  async switchCamera() {
    this.documentScannerService.switchCamera();
  }
}
