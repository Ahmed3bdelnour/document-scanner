import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DocumentScannerComponent } from './document-scanner/document-scanner.component';
import { JscannifyDocumentScannerComponent } from './jscannify-document-scanner/jscannify-document-scanner.component';

@NgModule({
  declarations: [		
    AppComponent,
      DocumentScannerComponent,
      JscannifyDocumentScannerComponent
   ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
