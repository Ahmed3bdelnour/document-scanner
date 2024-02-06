import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  showDocumentScanner = false;

  handleCapturedDocument(scannedDocument: File) {
    console.log('Scanned document: ', scannedDocument);
    this.downloadFile(scannedDocument);
  }

  downloadFile(file: File) {
    const blobUrl = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  }
}
