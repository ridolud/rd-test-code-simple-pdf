import { BadRequestException, Injectable, Scope } from '@nestjs/common';
import { PDFExtract, PDFExtractText } from 'pdf.js-extract';
import { IArea } from './interfaces/area.interface';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  unlinkSync,
} from 'fs';
import { randomUUID } from 'crypto';

@Injectable({
  scope: Scope.REQUEST,
})
export class WithholdingTaxService {
  private pdfExtract: PDFExtract;

  private pdfKit: PDFDocument;

  private storageDir = './tmp';

  private areasOfCapture: { [key: string]: IArea } = {
    // Nomor Bukti Potong
    h1: {
      x: 244,
      y: 86,
      w: 128,
      h: 21,
    },

    // Pembetulan
    h2: {
      x: 213,
      y: 104,
      w: 82,
      h: 17,
    },

    // NPWP
    a1: {
      x: 101,
      y: 146,
      w: 248,
      h: 18,
    },

    // Nama
    a3: {
      x: 100,
      y: 182,
      w: 455,
      h: 19,
    },

    // Masa Pajak
    b1: {
      x: 19,
      y: 275,
      w: 57,
      h: 15,
    },

    // Kode Object Pajak
    b2: {
      x: 83,
      y: 275,
      w: 77,
      h: 15,
    },

    // NPWP Pemotong
    c1: {
      x: 173,
      y: 431,
      w: 255,
      h: 16,
    },

    // Nama Pemotong
    c5: {
      x: 172,
      y: 492,
      w: 384,
      h: 14,
    },
  };

  constructor() {
    this.pdfExtract = new PDFExtract();
    this.pdfKit = new PDFDocument({ size: 'A4', margin: 30 });
  }

  private getStringsFromArea(contents: PDFExtractText[], area: IArea) {
    const arrOfStr = contents.filter(
      (i) =>
        i.x >= area.x &&
        i.y >= area.y &&
        i.x <= area.x + area.w &&
        i.y <= area.y + area.h,
    );

    return arrOfStr.map((i) => i.str).join('');
  }

  private async getRawContentOfStrings(buffer: Buffer) {
    const rawContents = await this.pdfExtract.extractBuffer(buffer);
    return rawContents.pages[0].content;
  }

  async getData(buffer: Buffer) {
    const rawContents = await this.getRawContentOfStrings(buffer);

    const h1 = this.getStringsFromArea(
      rawContents,
      this.areasOfCapture.h1,
    ).replaceAll(' ', '');

    // check validity from form register's numbers
    if (!h1 || h1 == '')
      throw new BadRequestException('File invalid or not fomated!');

    const h2 = this.getStringsFromArea(rawContents, this.areasOfCapture.h2);

    const a1 = this.getStringsFromArea(
      rawContents,
      this.areasOfCapture.a1,
    ).replaceAll(' ', '');

    const a3 = this.getStringsFromArea(rawContents, this.areasOfCapture.a3);

    const b1 = this.getStringsFromArea(
      rawContents,
      this.areasOfCapture.b1,
    ).replaceAll(' ', '');

    const b2 = this.getStringsFromArea(
      rawContents,
      this.areasOfCapture.b2,
    ).replaceAll(' ', '');

    const c1 = this.getStringsFromArea(
      rawContents,
      this.areasOfCapture.c1,
    ).replaceAll(' ', '');

    const c5 = this.getStringsFromArea(rawContents, this.areasOfCapture.c5);

    return {
      h1,
      h2,
      a1,
      a3,
      b1,
      b2,
      c1,
      c5,
    };
  }

  async getPdf(file: Express.Multer.File) {
    const data = await this.getData(file.buffer);

    this.pdfKit.fontSize(18).text('Potong Pajak Pembelian Barang', 30, 60);

    // H1
    this.pdfKit.fontSize(14).text('H1 :', 30, 100).text(data.h1, 70, 100);

    // H2
    this.pdfKit.fontSize(14).text('H2 :', 30, 120).text(data.h2, 70, 120);

    //A1
    this.pdfKit.fontSize(14).text('A1 :', 30, 140).text(data.a1, 70, 140);

    //A3
    this.pdfKit
      .fontSize(14)
      .text('-', 195, 140)
      .text('A3 :', 220, 140)
      .text(data.a3, 260, 140);

    //B1
    this.pdfKit.fontSize(14).text('B1 :', 30, 160).text(data.b1, 70, 160);

    //B2
    this.pdfKit
      .fontSize(14)
      .text('-', 195, 160)
      .text('B2 :', 220, 160)
      .text(data.b2, 260, 160);

    //C1
    this.pdfKit.fontSize(14).text('C1 :', 30, 180).text(data.c1, 70, 180);

    //C5
    this.pdfKit
      .fontSize(14)
      .text('-', 195, 180)
      .text('C5 :', 220, 180)
      .text(data.c5, 260, 180);

    const fileName = `${randomUUID()}.pdf`;
    mkdirSync(this.storageDir, { recursive: true });
    this.pdfKit.pipe(createWriteStream(`${this.storageDir}/${fileName}`));
    this.pdfKit.end();

    return fileName;
  }

  isExistPdf(fileName: string) {
    const path = `${this.storageDir}/${fileName}`;
    return existsSync(path);
  }

  removePdf(fileName: string) {
    if (this.isExistPdf(fileName)) {
      const path = `${this.storageDir}/${fileName}`;
      unlinkSync(path);
    }
  }

  downloadPdf(res: Response, fileName: string) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      `Content-Disposition`,
      `attachment; filename=bukti-potong-pajak-${fileName}`,
    );

    if (!this.isExistPdf(fileName)) return false;

    const path = `${this.storageDir}/${fileName}`;
    const file = createReadStream(path);
    file.on('end', () => {
      this.removePdf(fileName);
    });
    file.pipe(res);
  }
}
