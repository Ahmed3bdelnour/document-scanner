/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { JscannifyDocumentScannerComponent } from './jscannify-document-scanner.component';

describe('JscannifyDocumentScannerComponent', () => {
  let component: JscannifyDocumentScannerComponent;
  let fixture: ComponentFixture<JscannifyDocumentScannerComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ JscannifyDocumentScannerComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(JscannifyDocumentScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
