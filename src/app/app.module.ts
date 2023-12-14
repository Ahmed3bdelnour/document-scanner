import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DocumentScannerNewComponent } from './document-scanner-new/document-scanner-new.component';
import { DocumentScannerComponent } from './document-scanner/document-scanner.component';

@NgModule({
  declarations: [
    AppComponent,
    DocumentScannerComponent,
    DocumentScannerNewComponent,
  ],
  imports: [BrowserModule, AppRoutingModule, DragDropModule],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
